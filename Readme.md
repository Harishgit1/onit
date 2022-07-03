Solution step by step: 
    1   Get parent nodes using query?start=c/en/<search_term>>&rel=/r/IsA
    2   Recursively find its each parents from conceptnet
    3   Construct hierarchy for each term (by default it will construct upto 3 levels hierarchy)
    4   by passing limit parameter to url user can request number of levels

Things didnt do because of time constraint:
    1   No proper file structure like (handler, service, utils)
    2   Using dynamic programming would have helped with speed
    3   No rate limiting
    4   No proper Http utils functions
    5   No tests


How to Run:
    1   yarn
    2   yarn build
    3   yarn start

How to test:
    1   URL: http://localhost:8000/?searchTerm=supreme_court  (by default return hierarchy upto 3 levels)
    2   URL: http://localhost:8000/?searchTerm=supreme_court&limit=4 (construct hierarchy upto 4 levels)