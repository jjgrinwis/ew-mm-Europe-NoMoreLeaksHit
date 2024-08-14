import URLSearchParams from "url-search-params";
import { createResponse } from "create-response";
import { logger } from "log";
import { executeRestQL } from "./service.js";
import { QUERY_WORKER_NAME } from "./config.js";

let status = 500;

// typescript enforces us to "interface" this var, just do it.
interface QueryWorkerErrorResult {
  errorMessage?: string;
  errorNum?: any;
  errorCode?: number;
  error?: boolean;
}

export async function responseProvider(request: EW.ResponseProviderRequest) {
  const params = new URLSearchParams(request.query);

  /* 
  For the demo moving authorization key into 'hidden' PM_user var.
  authorization should look like "apikey {some key}" 
  */
  const authorizationHeader = `apikey ${request.getVariable(
    "PMUSER_MM_APIKEY"
  )}`;

  let result: QueryWorkerErrorResult = {};

  // for this query work the bindVars is optional, no need of feed any input params, for now.
  try {
    const document = await executeRestQL(
      QUERY_WORKER_NAME,
      authorizationHeader,
      JSON.parse(params.get("bindVars"))
    );

    result = document;
    status = 200;
  } catch (error) {
    logger.log("Error occurred while executing edgeWorker", error.toString());
    status = error.status || 500;
    result.error = true;

    if (error.status) {
      const dbError = JSON.parse(error.message) || {};
      result.errorCode = dbError.code;
      result.errorMessage = dbError.errorMessage || "Something went wrong";
      result.errorNum = dbError.errorNum;
    } else {
      result.errorMessage = error.toString() || "Something went wrong";
    }
  }

  return Promise.resolve(
    createResponse(
      status,
      {
        "Content-Type": "application/json",
        "Content-Language": "en-US",
      },
      JSON.stringify(result)
    )
  );
}
