require("dotenv").config();

const express = require("express");
const { auth } = require("express-openid-connect");
const { auth: validateAccessToken } = require("express-oauth2-jwt-bearer");

const app = express();

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET,
  baseURL: "http://localhost:3000",
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  authorizationParams: {
    response_type: "code",
    audience: "https://api.castrotech.local"
  }
};

const checkJwt = validateAccessToken({
  audience: "https://api.castrotech.local",
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`
});

app.use(auth(config));

const useSessionAccessToken = (req, res, next) => {
  if (!req.oidc.isAuthenticated()) {
    return res.redirect("/login");
  }

  const accessToken = req.oidc.accessToken?.access_token;

  if (!accessToken) {
    return res.status(401).send("Access token required.");
  }

  req.headers.authorization = `Bearer ${accessToken}`;
  next();
};

app.get("/", (req, res) => {
  if (req.oidc.isAuthenticated()) {
    res.send(`
      <h1>CastroTech Employee Portal</h1>
      <p>Authentication successful.</p>
      <p>Welcome, ${req.oidc.user.name || req.oidc.user.email}!</p>
      <p><a href="/profile">View Profile</a></p>
      <p><a href="/logout">Log Out</a></p>
    `);
  } else {
    res.send(`
      <h1>CastroTech Employee Portal</h1>
      <p>You are not authenticated.</p>
      <a href="/login">Log In with Auth0</a>
    `);
  }
});

app.get("/profile", (req, res) => {
  if (!req.oidc.isAuthenticated()) {
    return res.redirect("/login");
  }

  res.json(req.oidc.user);
});

app.get("/token-claims", (req, res) => {
  if (!req.oidc.isAuthenticated()) {
    return res.redirect("/login");
  }

  const accessToken = req.oidc.accessToken?.access_token;

  if (!accessToken) {
    return res.status(404).send("No access token found.");
  }

  const payload = JSON.parse(
    Buffer.from(accessToken.split(".")[1], "base64url").toString()
  );

  res.json({
    sub: payload.sub,
    aud: payload.aud,
    permissions: payload.permissions,
    scope: payload.scope
  });
});

app.get("/oidc-analysis", (req, res) => {
  if (!req.oidc.isAuthenticated()) {
    return res.redirect("/login");
  }

  const accessToken = req.oidc.accessToken?.access_token;

  if (!accessToken) {
    return res.status(401).send("Access token required.");
  }

  const payload = JSON.parse(
    Buffer.from(accessToken.split(".")[1], "base64url").toString()
  );

  res.json({
    id_token_claims: {
      sub: req.oidc.user.sub,
      email: req.oidc.user.email,
      name: req.oidc.user.name,
      amr: req.oidc.user.amr,
      acr: req.oidc.user.acr
    },
    access_token_claims: {
      sub: payload.sub,
      aud: payload.aud,
      scope: payload.scope,
      permissions: payload.permissions
    }
  });
});

app.get(
  "/it-dashboard",
  useSessionAccessToken,
  checkJwt,
  (req, res) => {
    const permissions = req.auth?.payload?.permissions || [];

    if (!permissions.includes("tickets:update")) {
      return res.status(403).send(`
        <h1>403 - Access Denied</h1>
        <p>You do not have permission to access the IT Analyst dashboard.</p>
        <p>Required permission: tickets:update</p>
        <a href="/">Return Home</a>
      `);
    }

    res.send(`
      <h1>CastroTech IT Analyst Dashboard</h1>
      <p>Authorization successful.</p>
      <p>Access token successfully verified.</p>
      <p>You have the required <strong>tickets:update</strong> permission.</p>
      <a href="/">Return Home</a>
    `);
  }
);

app.get(
  "/security-dashboard",
  useSessionAccessToken,
  checkJwt,
  (req, res) => {
    const permissions = req.auth?.payload?.permissions || [];

    if (!permissions.includes("security:investigate")) {
      return res.status(403).send(`
        <h1>403 - Access Denied</h1>
        <p>You do not have permission to access the Security Analyst dashboard.</p>
        <p>Required permission: security:investigate</p>
        <a href="/">Return Home</a>
      `);
    }

    res.send(`
      <h1>CastroTech Security Analyst Dashboard</h1>
      <p>Authorization successful.</p>
      <p>Access token successfully verified.</p>
      <p>You have the required <strong>security:investigate</strong> permission.</p>
      <a href="/">Return Home</a>
    `);
  }
);

app.get(
  "/api/verified",
  useSessionAccessToken,
  checkJwt,
  (req, res) => {
    res.json({
      message: "Access token verified successfully.",
      verification: {
        signature: "verified",
        issuer: "verified",
        audience: "verified"
      }
    });
  }
);

app.listen(3000, () => {
  console.log("CastroTech Employee Portal running at http://localhost:3000");
});