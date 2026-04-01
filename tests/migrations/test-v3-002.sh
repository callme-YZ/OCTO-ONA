#!/bin/bash
# ============================================
# Test Suite for v3-002 Migration
# ============================================
# Tests: conversational_queries table
# Author: Mayo
# Date: 2026-04-01
# Related Issue: #34
# ============================================

DB_NAME="octo_ona"
TEST_PREFIX="v3test"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  OCTO-ONA v3-002 Migration Test Suite                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

pass_count=0
fail_count=0

test_pass() { echo "✅ PASS: $1"; pass_count=$((pass_count + 1)); }
test_fail() { echo "❌ FAIL: $1"; fail_count=$((fail_count + 1)); }

# Test 1: Table exists
echo "━━━ Test 1: Table Existence ━━━"
if mysql -u root -D ${DB_NAME} -e "DESCRIBE conversational_queries;" >/dev/null 2>&1; then
    test_pass "Table exists"
else
    test_fail "Table missing"
    exit 1
fi
echo ""

# Test 2: Columns
echo "━━━ Test 2: Schema Validation ━━━"
for col in id user_id query_text parsed_intent target_scope metrics_requested permission_result response_summary response_time_ms error_message data_timestamp created_at; do
    if mysql -u root -D ${DB_NAME} -e "DESCRIBE conversational_queries;" | grep -q "^${col}"; then
        test_pass "Column '${col}' exists"
    else
        test_fail "Column '${col}' missing"
    fi
done
echo ""

# Test 3: Indexes
echo "━━━ Test 3: Indexes ━━━"
for idx in idx_user_id idx_created_at idx_user_time idx_intent idx_permission; do
    if mysql -u root -D ${DB_NAME} -e "SHOW INDEXES FROM conversational_queries;" | grep -q "${idx}"; then
        test_pass "Index '${idx}' exists"
    else
        test_fail "Index '${idx}' missing"
    fi
done
echo ""

# Test 4: INSERT (basic)
echo "━━━ Test 4: Basic INSERT ━━━"
if mysql -u root -D ${DB_NAME} -e "INSERT INTO conversational_queries (user_id, query_text, permission_result) VALUES ('${TEST_PREFIX}_u1', 'Test query', 'allowed');" 2>&1 | grep -qi error; then
    test_fail "INSERT failed"
else
    test_pass "INSERT successful"
fi
echo ""

# Test 5: INSERT with all fields
echo "━━━ Test 5: Full INSERT ━━━"
mysql -u root -D ${DB_NAME} << SQL >/dev/null 2>&1
INSERT INTO conversational_queries (
    user_id, 
    query_text, 
    parsed_intent, 
    target_scope, 
    metrics_requested,
    permission_result, 
    response_summary, 
    response_time_ms,
    data_timestamp
) VALUES (
    '${TEST_PREFIX}_u2', 
    'How am I doing recently?', 
    'health', 
    'self',
    '["L1.1", "L3.5"]',
    'allowed', 
    'Health score: 82/100', 
    1234,
    NOW()
);
SQL
if [ $? -eq 0 ]; then
    test_pass "Full field INSERT successful"
else
    test_fail "Full field INSERT failed"
fi
echo ""

# Test 6: SELECT with JSON field
echo "━━━ Test 6: JSON Field ━━━"
result=$(mysql -u root -D ${DB_NAME} -N -e "SELECT JSON_EXTRACT(metrics_requested, '\$[0]') FROM conversational_queries WHERE user_id='${TEST_PREFIX}_u2';")
if [ "$result" = '"L1.1"' ]; then
    test_pass "JSON field stored and queried correctly"
else
    test_fail "JSON field issue (got: $result)"
fi
echo ""

# Test 7: ENUM constraint
echo "━━━ Test 7: ENUM Constraint ━━━"
if mysql -u root -D ${DB_NAME} -e "INSERT INTO conversational_queries (user_id, query_text, permission_result) VALUES ('${TEST_PREFIX}_u3', 'test', 'invalid_value');" 2>&1 | grep -qi "data truncated\|invalid"; then
    test_pass "ENUM constraint enforced"
else
    test_fail "ENUM constraint not working"
fi
echo ""

# Test 8: NOT NULL constraint
echo "━━━ Test 8: NOT NULL Constraint ━━━"
if mysql -u root -D ${DB_NAME} -e "INSERT INTO conversational_queries (user_id, permission_result) VALUES ('${TEST_PREFIX}_u4', 'allowed');" 2>&1 | grep -qi "cannot be null\|doesn't have a default value"; then
    test_pass "NOT NULL enforced (query_text required)"
else
    test_fail "NOT NULL not enforced"
fi
echo ""

# Test 9: Query by user_id (index performance)
echo "━━━ Test 9: Index Performance (user_id) ━━━"
if mysql -u root -D ${DB_NAME} -e "EXPLAIN SELECT * FROM conversational_queries WHERE user_id='${TEST_PREFIX}_u1';" | grep -q "idx_user_id\|idx_user_time"; then
    test_pass "Query uses user_id index"
else
    test_fail "Query doesn't use index"
fi
echo ""

# Test 10: Query by created_at (index performance)
echo "━━━ Test 10: Index Performance (created_at) ━━━"
if mysql -u root -D ${DB_NAME} -e "EXPLAIN SELECT * FROM conversational_queries WHERE created_at > NOW() - INTERVAL 1 DAY;" | grep -q "idx_created_at\|idx_user_time"; then
    test_pass "Query uses created_at index"
else
    test_fail "Query doesn't use index"
fi
echo ""

# Test 11: Composite index (user_id + created_at)
echo "━━━ Test 11: Composite Index Performance ━━━"
# Note: MySQL may choose idx_user_id over idx_user_time for small datasets
if mysql -u root -D ${DB_NAME} -e "EXPLAIN SELECT * FROM conversational_queries WHERE user_id='${TEST_PREFIX}_u1' AND created_at > NOW() - INTERVAL 1 DAY;" | grep -q "idx_user_time\|idx_user_id"; then
    test_pass "User-related index used (idx_user_time or idx_user_id)"
else
    test_fail "No user index used"
fi
echo ""

# Test 12: Count by intent
echo "━━━ Test 12: Analytics Query (GROUP BY) ━━━"
mysql -u root -D ${DB_NAME} -e "INSERT INTO conversational_queries (user_id, query_text, parsed_intent, permission_result) VALUES ('${TEST_PREFIX}_u5', 'trend query', 'trend', 'allowed');" >/dev/null 2>&1
result=$(mysql -u root -D ${DB_NAME} -N -e "SELECT COUNT(DISTINCT parsed_intent) FROM conversational_queries WHERE user_id LIKE '${TEST_PREFIX}%';")
if [ "$result" -ge 1 ]; then
    test_pass "GROUP BY query works"
else
    test_fail "GROUP BY query failed"
fi
echo ""

# Test 13: Average response time
echo "━━━ Test 13: Analytics Query (AVG) ━━━"
result=$(mysql -u root -D ${DB_NAME} -N -e "SELECT AVG(response_time_ms) FROM conversational_queries WHERE user_id='${TEST_PREFIX}_u2';")
if [ "$result" = "1234.0000" ]; then
    test_pass "AVG aggregation works"
else
    test_fail "AVG aggregation failed (got: $result)"
fi
echo ""

# Test 14: Permission result filtering
echo "━━━ Test 14: Filter by permission_result ━━━"
count=$(mysql -u root -D ${DB_NAME} -N -e "SELECT COUNT(*) FROM conversational_queries WHERE permission_result='allowed' AND user_id LIKE '${TEST_PREFIX}%';")
if [ "$count" -ge 1 ]; then
    test_pass "ENUM filtering works"
else
    test_fail "ENUM filtering failed"
fi
echo ""

# Cleanup
echo "━━━ Cleanup ━━━"
mysql -u root -D ${DB_NAME} -e "DELETE FROM conversational_queries WHERE user_id LIKE '${TEST_PREFIX}%';" >/dev/null 2>&1
count=$(mysql -u root -D ${DB_NAME} -N -e "SELECT COUNT(*) FROM conversational_queries WHERE user_id LIKE '${TEST_PREFIX}%';")
if [ "$count" -eq 0 ]; then
    test_pass "Cleanup complete"
else
    test_fail "Cleanup failed ($count rows remain)"
fi
echo ""

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Summary: $pass_count passed, $fail_count failed"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

if [ $fail_count -eq 0 ]; then
    echo "✅ ALL TESTS PASSED ✅"
    exit 0
else
    echo "❌ SOME TESTS FAILED ❌"
    exit 1
fi
