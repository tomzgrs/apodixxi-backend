#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Mobile application for tracking supermarket purchases via QR scanning or URL pasting.
  Auto-scrapes receipt data from Greek supermarkets. Supports dual language (Greek/English).
  Recently implemented WebView fallback for Epsilon Digital stores (AB Vassilopoulos, Market In, Bazaar).

backend:
  - task: "URL Import - Entersoft/Impact providers"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Entersoft and Impact parsers working correctly"

  - task: "URL Import - Epsilon Digital detection"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Returns webview_required status for Epsilon Digital URLs"
      - working: true
        agent: "testing"
        comment: "✅ TESTED: POST /api/receipts/import-url with Epsilon Digital URL correctly returns {status: 'webview_required', url: '...', message: '...'} - Detection working perfectly"

  - task: "WebView Data Import endpoint"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Endpoint /api/receipts/import-webview created to accept extracted DOM data"
      - working: true
        agent: "testing"
        comment: "✅ TESTED: POST /api/receipts/import-webview successfully processes mock extracted data with 2 items (ΓΑΛΑ ΦΡΕΣΚΟ 1L, ΨΩΜΙ ΤΟΣΤ), creates receipt with correct totals (5.2€), stores in database, and returns proper response structure. VAT extraction from raw_text working (ΑΦΜ: 123456789). Edge cases tested: empty items rejected, malformed data rejected."

  - task: "XML Import"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "myData XML parser working"

  - task: "Manual Receipt Entry"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Manual entry endpoint working"

  - task: "Device Registration"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Anonymous device ID registration working"

  - task: "Statistics and Dashboard data"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Stats endpoint returning data correctly"

frontend:
  - task: "Add Receipt Tab - URL Import"
    implemented: true
    working: true
    file: "/app/frontend/app/(tabs)/add.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "URL tab handles webview_required response and redirects to webview-import screen"

  - task: "WebView Import Screen"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/webview-import.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "WebView screen created with DOM extraction JavaScript, fallback for web platform"

  - task: "QR Scanner - Epsilon URL routing"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/scanner.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Scanner now routes Epsilon URLs directly to WebView screen"

  - task: "API Client - importWebViewData"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/api.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added importWebViewData function to API client"

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Implemented WebView fallback for Epsilon Digital stores. Key changes:
      1. Backend returns status: "webview_required" for epsilon digital URLs
      2. Frontend add.tsx and scanner.tsx redirect to /webview-import?url=<url>
      3. webview-import.tsx loads URL in WebView, injects JS to extract DOM data
      4. Backend /api/receipts/import-webview parses the extracted data
      Please test:
      - POST /api/receipts/import-url with epsilon digital URL should return webview_required
      - POST /api/receipts/import-webview with mock extracted data should create receipt
  - agent: "testing"
    message: |
      ✅ BACKEND TESTING COMPLETE - All WebView import functionality working perfectly!
      
      TESTED SUCCESSFULLY:
      1. Epsilon Digital URL Detection: ✅ Returns webview_required status correctly
      2. WebView Data Import: ✅ Processes extracted data, creates receipts, stores in DB
      3. Core API Endpoints: ✅ Device registration, stats, receipts listing all working
      4. Edge Cases: ✅ Empty items rejected, malformed data rejected, non-supported URLs rejected
      
      VERIFICATION:
      - Created test receipt with 2 items (ΓΑΛΑ ΦΡΕΣΚΟ 1L, ΨΩΜΙ ΤΟΣΤ) totaling 5.2€
      - Receipt stored in database with correct source_type: "webview" and provider: "Epsilon Digital (WebView)"
      - VAT extraction from raw text working (ΑΦΜ: 123456789)
      - All backend endpoints responding correctly via https://deal-finder-396.preview.emergentagent.com/api
      
      Backend WebView import flow is production-ready!