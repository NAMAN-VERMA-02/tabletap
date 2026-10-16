import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api/v1`,
  withCredentials: true, // send the httpOnly auth cookie
});

// Turn API errors into a readable message.
export function errorMessage(err) {
  const data = err?.response?.data;
  if (data?.details?.length) return data.details.map((d) => d.message).join(', ');
  return data?.message || err?.message || 'Something went wrong';
}

export default api;
