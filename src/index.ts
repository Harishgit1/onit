import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app: Express = express();
const port = process.env.PORT;
const url = `http://api.conceptnet.io/`;

/*
retrieve terms from conceptnet edges
*/
const retrieveParentTerms = (input: any[]): string[] => {
  const parentTerms = input.map((x) => {
    return x.end.term.slice(6);
  });

  let uniq = [...new Set(parentTerms)]; //remove duplicates
  return uniq;
};

/*Insert each hierarchy in correct fashion
This function will insert data at its correct hierarchy
*/
const insertInFinalResult = (parent: string, child: any, finalResult: any) => {
    console.log(`************ parent: ${parent}, child: ${JSON.stringify(child)}, finalResult: ${JSON.stringify(finalResult)} `);
  if (!finalResult[parent]) {
    finalResult[parent] = child;
  } else {
    let key1 = Object.keys(child)[0];
    let childObjectToUpdate = child[key1];
    let finalResultPosition = Object.keys(finalResult[parent]);
    let objectToUpdate = finalResult[parent];
    while (
      finalResultPosition.length > 0 &&
      key1 &&
      finalResultPosition.includes(key1)
    ) {
      // Loop until hiearchy is not same
      objectToUpdate = objectToUpdate[key1];
      if(!objectToUpdate) return
      finalResultPosition = Object.keys(objectToUpdate);
      key1 = Object.keys(childObjectToUpdate)[0];
      childObjectToUpdate = childObjectToUpdate[key1];
      if(!childObjectToUpdate) return
    }

    objectToUpdate[key1] = childObjectToUpdate;
  }
};

/*
This function recursively fetches related terms from conceptnet
if the recived terms has the term which are related to actual search term it will inturn fetches its related terms
terms which are not related to original search term are ignored (Otherwise parent nodes will grow endlessly)
after finishing each parent node hierarchy structure inserted into finalResult
*/

const findHierarchyOfTopics = async (
  parent: string,
  child: any,
  finalResult: any,
  relatedTerms: string[],
  threshold: number
) => {
   
  threshold--;
  const parentConcepts = await getParentConcepts(parent, threshold);
//   console.log(
//     `**** parents for ${parent}(${threshold}) are : ${JSON.stringify(parentConcepts)}`
//   );

  if (parentConcepts.length <= 0) {
    insertInFinalResult(parent, child, finalResult);
    return;
  }
  let count = 0;
  for (let index = 0; index < parentConcepts.length; index++) {
    const element = parentConcepts[index];
    if (element === parent) continue;
    if (parent === Object.keys(child)[0]) {
      await findHierarchyOfTopics(element, child, finalResult, relatedTerms, threshold);
    } else {
    //   if (!relatedTerms.includes(element)) {
    //     continue;
    //   }
      count++;
      await findHierarchyOfTopics(
        element,
        { [parent]: child },
        finalResult,
        relatedTerms,
        threshold
      );
    }
  }
  if (count === 0) {
    insertInFinalResult(parent, child, finalResult);
  }
};

//Retrieve nodes which has isa relation witht the search term from conceptnet.
const getParentConcepts = async (term: string, limit = 100) => {
  const startInput = `/c/en/${term.replace(/ /g, "_")}`;
  if(limit === 0){
    return [];
  }

  const result = await axios.get(`${url}/query`, {
    params: {
      start: startInput,
      rel: "/r/IsA",
      limit: 100,
    },
  });

  return retrieveParentTerms(result.data.edges);
};

//Get api handler
app.get("/", async (req: Request, res: Response) => {
  let term = req.query.searchTerm as string;
  let limitInput = req.query.limit as string;
  const limit = (limitInput) ? parseInt(limitInput) : 3;


  // validate searchTerm
  if (!term) {
    return res.status(400).send({ message: "Invalid searchTerm" });
  }
  let finalResult = {};
  const searchTerm = term.replace(/ /g, "_");
  try {
    let relatedTerms = await getParentConcepts(searchTerm);
    //Get concept hierarchy
    await findHierarchyOfTopics(searchTerm, {}, finalResult, relatedTerms, limit);
  } catch (error:any) {
    console.log(`error: ${JSON.stringify(error.message)}`);
    return res.status(500).send({ message: "Internal server error" });
  }

  res.send(JSON.stringify(finalResult));
});

//server listen
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});
