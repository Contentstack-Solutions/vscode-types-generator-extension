import axios, { AxiosRequestConfig, Method } from "axios";

import { StackConnectionConfig } from "../../models/models";

export const getDefaultAxiosOptions = (
  options: AxiosRequestConfig<any>,
  apiKey: string,
  token: string
): AxiosRequestConfig<any> => {
  return {
    ...options,
    headers: {
      ...options.headers,
      authorization: token,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      api_key: apiKey,
    },
  };
};

// export const getJsonUniquePath = (id: string) => {
//   return `${env.DEFAULT_FILE_LOCATION}/${id}.json`;
// };

// export const getEntry = async (contentTypeUid: string, uid: string, includes?: string[]) => {
//   const options = getDefaultAxiosOptions({ method: "GET" });
//   let url = `${env.CS_CM_API_BASE_URL}/v3/content_types/${contentTypeUid}/entries/${uid}`;
//   if (includes) {
//     url = `${url}?${includes.join("&include[]=")}`;
//   }
//   let response = await axios(url, options);
//   return Promise.resolve(response.data.entry);
// };

export async function getContentTypes(config: StackConnectionConfig) {
  let url = `${config.baseUrl}/v3/content_types`;
  const options = getDefaultAxiosOptions({ method: "GET" }, config.apiKey, config.token);
  const response = await axios(url, options);
  return Promise.resolve(response.data.content_types);
}

export const getGlobalFields = async (config: StackConnectionConfig) => {
  let url = `${config.baseUrl}/v3/global_fields`;
  const options = getDefaultAxiosOptions({ method: "GET" }, config.apiKey, config.token);
  const response = await axios(url, options);
  return Promise.resolve(response.data.global_fields);
};
