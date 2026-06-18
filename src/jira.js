import axios from "axios";

export async function postJiraComment({ baseUrl, email, apiToken, issueKey, body }) {
  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");
  const url = `${baseUrl}/rest/api/3/issue/${issueKey}/comment`;

  await axios.post(
    url,
    { body },
    {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    }
  );
}
