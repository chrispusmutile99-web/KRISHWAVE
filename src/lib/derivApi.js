// Deriv API Configuration & Helper Module
export const DERIV_APP_ID = "34hTH0v223shdj971TKtV";
const WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`;

let socket = null;
let token = localStorage.getItem("deriv_token") || null;
const listeners = new Set();

/**
 * Get current OAuth setup status
 */
export const isLiveConfigured = () => {
  return Boolean(token);
};

/**
 * Get active token
 */
export const getToken = () => token;

/**
 * Set active token
 */
export const setToken = (newToken) => {
  token = newToken;
  if (newToken) {
    localStorage.setItem("deriv_token", newToken);
  } else {
    localStorage.removeItem("deriv_token");
  }
};

/**
 * Initialize WebSocket connection
 */
export const initDerivSocket = () => {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }

  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log("Connected to Deriv WebSocket");
    if (token) {
      authorizeToken(token);
    }
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      listeners.forEach((listener) => listener(data));
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
    }
  };

  socket.onerror = (error) => {
    console.error("Deriv WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("Deriv WebSocket connection closed. Reconnecting...");
    setTimeout(() => {
      initDerivSocket();
    }, 3000);
  };

  return socket;
};

/**
 * Subscribe to raw WebSocket messages
 */
export const addMessageListener = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

/**
 * Send request over WebSocket
 */
export const sendRequest = (req) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    socket = initDerivSocket();
    setTimeout(() => sendRequest(req), 1000);
    return;
  }
  socket.send(JSON.stringify(req));
};

/**
 * Authorize token with Deriv
 */
export const authorizeToken = (authToken) => {
  setToken(authToken);
  sendRequest({
    authorize: authToken,
  });
};

/**
 * Subscribe to tick feed for a symbol
 */
export const subscribeTicks = (symbol) => {
  sendRequest({
    ticks: symbol,
  });
};

/**
 * Unsubscribe from tick feed
 */
export const unsubscribeTicks = (symbol) => {
  sendRequest({
    forget_all: "ticks",
  });
};

/**
 * Execute contract purchase
 */
export const buyContract = ({ contract_type, symbol, amount, duration, duration_unit = "t" }) => {
  sendRequest({
    buy: 1,
    price: amount,
    parameters: {
      amount: amount,
      basis: "stake",
      contract_type: contract_type,
      currency: "USD",
      duration: duration,
      duration_unit: duration_unit,
      symbol: symbol,
    },
  });
};

