import axios from "axios";

const WEBEX_BASE_URL = "https://webexapis.com/v1";

export async function getMessageById(token, messageId) {
  const response = await axios.get(`${WEBEX_BASE_URL}/messages/${messageId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}

export async function sendRoomMessage(token, roomId, text) {
  await axios.post(
    `${WEBEX_BASE_URL}/messages`,
    { roomId, text },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}
