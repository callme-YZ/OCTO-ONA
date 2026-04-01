#!/bin/bash
DB_NAME="octo_ona"
TEST_PREFIX="v3test"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  OCTO-ONA v3-001 Migration Test Suite                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

pass_count=0
fail_count=0

test_pass() { echo "✅ PASS: $1"; pass_count=$((pass_count + 1)); }
test_fail() { echo "❌ FAIL: $1"; fail_count=$((fail_count + 1)); }

# Test 1: Table exists
echo "━━━ Test 1: Table Existence ━━━"
if mysql -u root -D ${DB_NAME} -e "DESCRIBE user_bot_ownership;" >/dev/null 2>&1; then
    test_pass "Table exists"
else
    test_fail "Table missing"
    exit 1
fi
echo ""

# Test 2: Columns
echo "━━━ Test 2: Schema Validation ━━━"
for col in id user_id bot_id source_id created_at updated_at; do
    if mysql -u root -D ${DB_NAME} -e "DESCRIBE user_bot_ownership;" | grep -q "^${col}"; then
        test_pass "Column '${col}' exists"
    else
        test_fail "Column '${col}' missing"
    fi
done
echo ""

# Test 3: Indexes
echo "━━━ Test 3: Indexes ━━━"
for idx in idx_user_id idx_bot_id idx_source_id uk_user_bot; do
    if mysql -u root -D ${DB_NAME} -e "SHOW INDEXES FROM user_bot_ownership;" | grep -q "${idx}"; then
        test_pass "Index '${idx}' exists"
    else
        test_fail "Index '${idx}' missing"
    fi
done
echo ""

# Test 4: INSERT
echo "━━━ Test 4: INSERT ━━━"
if mysql -u root -D ${DB_NAME} -e "INSERT INTO user_bot_ownership (user_id, bot_id, source_id) VALUES ('${TEST_PREFIX}_u1', '${TEST_PREFIX}_b1', 'dmwork');" 2>&1 | grep -qi error; then
    test_fail "INSERT failed"
else
    test_pass "INSERT successful"
fi
echo ""

# Test 5: SELECT
echo "━━━ Test 5: SELECT ━━━"
count=$(mysql -u root -D ${DB_NAME} -N -e "SELECT COUNT(*) FROM user_bot_ownership WHERE user_id LIKE '${TEST_PREFIX}%';")
if [ "$count" -eq 1 ]; then
    test_pass "SELECT returns correct count"
else
    test_fail "SELECT failed (expected 1, got $count)"
fi
echo ""

# Test 6: UNIQUE constraint
echo "━━━ Test 6: UNIQUE Constraint ━━━"
if mysql -u root -D ${DB_NAME} -e "INSERT INTO user_bot_ownership (user_id, bot_id, source_id) VALUES ('${TEST_PREFIX}_u1', '${TEST_PREFIX}_b1', 'dmwork');" 2>&1 | grep -qi "duplicate entry"; then
    test_pass "UNIQUE enforced"
else
    test_fail "UNIQUE not working"
fi
echo ""

# Test 7: Multiple ownership
echo "━━━ Test 7: Multiple Ownership ━━━"
mysql -u root -D ${DB_NAME} -e "INSERT INTO user_bot_ownership (user_id, bot_id, source_id) VALUES ('${TEST_PREFIX}_u1', '${TEST_PREFIX}_b2', 'dmwork'), ('${TEST_PREFIX}_u2', '${TEST_PREFIX}_b3', 'dmwork');" >/dev/null 2>&1
count=$(mysql -u root -D ${DB_NAME} -N -e "SELECT COUNT(*) FROM user_bot_ownership WHERE user_id='${TEST_PREFIX}_u1';")
if [ "$count" -eq 2 ]; then
    test_pass "User can own multiple bots"
else
    test_fail "Multiple ownership failed (expected 2, got $count)"
fi
echo ""

# Test 8: Index usage
echo "━━━ Test 8: Index Performance ━━━"
if mysql -u root -D ${DB_NAME} -e "EXPLAIN SELECT * FROM user_bot_ownership WHERE user_id='${TEST_PREFIX}_u1';" | grep -q "idx_user_id\|uk_user_bot"; then
    test_pass "Query uses index"
else
    test_fail "Query doesn't use index"
fi
echo ""

# Cleanup
echo "━━━ Cleanup ━━━"
mysql -u root -D ${DB_NAME} -e "DELETE FROM user_bot_ownership WHERE user_id LIKE '${TEST_PREFIX}%';" >/dev/null 2>&1
count=$(mysql -u root -D ${DB_NAME} -N -e "SELECT COUNT(*) FROM user_bot_ownership WHERE user_id LIKE '${TEST_PREFIX}%';")
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
