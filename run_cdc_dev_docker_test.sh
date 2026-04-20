#!/bin/bash
# Function to run a test and check the result
run_test() {
  local test_name="$1"
  local command="$2"
  local expected_exit_code="$3"
  echo -n "Running test: $test_name... "
  
  # Run the command and capture output
  local output
  output=$(eval "$command" 2>&1)
  local actual_exit_code=$?
  if [ "$actual_exit_code" -eq "$expected_exit_code" ]; then
    echo "PASS"
  else
    echo "FAIL (Expected $expected_exit_code, got $actual_exit_code)"
    echo "Output was:"
    echo "$output"
    return 1
  fi
}
# --- Your Tests Here ---
# Assuming the script you want to test is called 'myscript.sh'
TARGET_SCRIPT="./myscript.sh"
# Test 1: Success case
run_test "Test help flag" "$TARGET_SCRIPT --help" 0
# Test 2: Failure case
run_test "Test invalid argument" "$TARGET_SCRIPT --invalid-option" 1
# Test 3: Output checking
echo -n "Running test: Test output content... "
output=$($TARGET_SCRIPT --name "World")
if [[ "$output" == *"Hello World"* ]]; then
    echo "PASS"
else
    echo "FAIL (Output did not match)"
    echo "Got: $output"
fi