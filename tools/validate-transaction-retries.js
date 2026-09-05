const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const serverPath = path.join(root, "functions", "index.js");
const serverSource = fs.readFileSync(serverPath, "utf8");

function sourceRange(startMarker, endMarker) {
  const start = serverSource.indexOf(startMarker);
  const end = serverSource.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `Could not isolate ${startMarker}.`);
  return { start, end, source: serverSource.slice(start, end) };
}

const retryHelper = sourceRange(
  "async function runTransactionWithInfrastructureRetry",
  "function requireGameServerId"
);
assert.match(
  retryHelper.source,
  /return await measuredTransaction\(operation, transactionOptions\)/,
  "The retry helper no longer delegates each attempt to Firestore."
);
const measuredHelper = sourceRange("function measuredTransaction", "function isRetryableTransactionInfrastructureError");
assert.match(measuredHelper.source, /db\.runTransaction\(transaction =>[\s\S]*return operation\(transaction\)[\s\S]*transactionOptions/,
  "Timing must preserve Firestore's callback, retries, and read-only options.");
assert.match(
  retryHelper.source,
  /isRetryableTransactionInfrastructureError\(error\)[\s\S]*?attempt >= maxAttempts/,
  "The retry helper no longer limits retries to infrastructure failures."
);

const starterClaim = sourceRange(
  "async function claimFreshStartingCity",
  "exports.claimStartingCity"
);
assert.match(
  starterClaim.source,
  /db\.runTransaction\([\s\S]*?\{ maxAttempts: 1 \}[\s\S]*?retryableContention/,
  "Starting-city placement lost its dedicated reservation/contention retry loop."
);

const rawTransactionCalls = [...serverSource.matchAll(/db\.runTransaction\(/g)];
assert.equal(
  rawTransactionCalls.length,
  2,
  "A Firestore transaction bypasses the shared infrastructure retry contract."
);
for (const match of rawTransactionCalls) {
  const index = match.index;
  const allowed = (index >= measuredHelper.start && index < measuredHelper.end)
    || (index >= starterClaim.start && index < starterClaim.end);
  assert.ok(allowed, `Unexpected raw Firestore transaction near character ${index}.`);
}

const relinquishCity = sourceRange("exports.relinquishCity", "exports.relocateMainCity").source;
assert.match(
  relinquishCity,
  /runTransactionWithInfrastructureRetry\(async transaction => \{/,
  "City relinquishment can still surface transient transaction failures as INTERNAL errors."
);

const preparedEconomyCalls = [...serverSource.matchAll(/prepareEconomyCollection\(transaction,/g)].length;
const retryTransactionCallbacks = [...serverSource.matchAll(
  /runTransactionWithInfrastructureRetry\(async transaction => \{/g
)].length;
assert.ok(preparedEconomyCalls > 20, "The validator did not find the expected economy transaction surface.");
assert.ok(
  retryTransactionCallbacks >= preparedEconomyCalls,
  "Some economy-backed transaction callbacks do not use the shared retry wrapper."
);

console.log(
  `Validated retry-safe Firestore transactions (${retryTransactionCallbacks} callbacks, ${preparedEconomyCalls} economy preparations).`
);
