import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import sqlite from "node:sqlite";

import * as t from "./template.ts";

/**
 * Types
 */
type User = { id: number; username: string };
type Session = { id: string; expires_at: string; user_id: number };
type Response = http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage };
type Request = http.IncomingMessage;
export type Props = {
  title: string;
  user: User;
  session: Session;
};

declare module "http" {
  interface ServerResponse {
    render: <T extends Partial<Pick<Props, "title">>>(name: string, data: T) => void;
  }

  interface IncomingMessage {
    params: Record<string, string>;
    user: User;
    session: Session;
    cookies: Record<string, string>;
  }
}

/**
 * Constants
 */
const PORT = 5000;
const HOST_NAME = "127.0.0.1";

/**
 * Database
 */
const db = new sqlite.DatabaseSync("db.sqlite");

const sql = (strings: TemplateStringsArray, ...values: any[]): string => {
  return String.raw({ raw: strings }, ...values);
};

db.exec(sql`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`);

db.exec(sql`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    expires_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`);

/**
 * Utils
 */
function render(req: Request, res: Response) {
  return <T extends Partial<Pick<Props, "title">>>(name: string, data: T) => {
    const children = t[name];

    if (!children) {
      res.writeHead(404);
      res.end("Page not found");
      return;
    }

    const rendered = t.template({
      children: children,
      data: { ...data, title: data?.title ?? "", user: req.user, session: req.session },
    });

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(rendered);
  };
}

async function handleStatic(req: Request, res: Response) {
  if (!req.url) return false;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  const publicDir = path.resolve(process.cwd(), "public");
  const filePath = path.join(publicDir, pathname);
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(publicDir)) {
    return false;
  }

  try {
    const stats = await fs.stat(resolvedPath);

    if (stats.isDirectory()) {
      return false;
    }

    const content = await fs.readFile(resolvedPath);
    const ext = path.extname(resolvedPath);

    res.writeHead(200, { "Content-Type": getMimeType(ext), "Content-Length": content.length });
    res.end(content);
    return true;
  } catch (err) {
    return false;
  }
}

function getMimeType(ext: string): string {
  const mimeTypes: { [key: string]: string } = {
    ".html": "text/html",
    ".htm": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".bmp": "image/bmp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".json": "application/json",
    ".xml": "application/xml",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
    ".gz": "application/gzip",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
  };

  return mimeTypes[ext.toLowerCase()] || "application/octet-stream";
}

/**
 * Password Utilities
 */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === verifyHash;
}

/**
 * Cookie Parsing
 */
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce(
    (cookies, cookie) => {
      const [name, value] = cookie.trim().split("=");
      cookies[name] = decodeURIComponent(value);
      return cookies;
    },
    {} as Record<string, string>,
  );
}

async function attachUser(req: Request, _res: Response) {
  const session = await getSession(req);
  if (!session) return;

  const user = await getUserFromSession(session);
  if (!user) return;

  req.user = user;
  req.session = session;
}

/**
 * Session Management
 */
async function getSession(req: Request): Promise<Session | null> {
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return null;
  }

  const session = db
    .prepare("SELECT * FROM sessions WHERE id = ?")
    .get(sessionId) as Session | null;

  if (!session) {
    return null;
  }

  const expiresAt = new Date(session.expires_at);

  if (expiresAt < new Date()) {
    db.prepare(sql`DELETE FROM sessions WHERE id = ?`).run(sessionId);
    return null;
  }

  return session;
}

async function getUserFromSession(session: Session): Promise<User | null> {
  const user = db
    .prepare(sql`SELECT * FROM users WHERE id = ?`)
    .get(session.user_id) as User | null;
  return user;
}

/**
 * Bootstrap
 */
async function bootstrap() {
  const server = http.createServer(async (req, res) => {
    req.cookies = parseCookies(req.headers.cookie);
    await attachUser(req, res);
    res.render = render(req, res);

    if (!req.url) return false;
    if (await handleStatic(req, res)) return;

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname === "/") {
      homeController(req, res);
      return;
    }

    if (pathname === "/login") {
      loginController(req, res);
      return;
    }

    if (pathname === "/register") {
      registerController(req, res);
      return;
    }

    if (pathname === "/logout") {
      logoutController(req, res);
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(PORT, HOST_NAME, () => {
    console.log(`Server is up & running on http://${HOST_NAME}:${PORT}!!`);
  });
}

/**
 * Controllers
 */
function homeController(req: Request, res: Response) {
  const method = req.method;

  if (method === "GET") {
    res.render("home", { title: "Home Page" });
    return;
  }
}

function loginController(req: Request, res: Response) {
  const method = req.method;

  if (method === "GET") {
    res.render("login", { title: "Login Page" });
    return;
  }

  if (method === "POST") {
    let body = "";
    req.on("data", (chunk) => void (body += chunk.toString()));
    req.on("end", () => {
      const formData = new URLSearchParams(body);
      const username = formData.get("username");
      const password = formData.get("password");

      const user = db.prepare(sql`SELECT * FROM users WHERE username = ?`).get(username) as
        | (User & { password: string })
        | null;

      if (!user || !verifyPassword(password!, user.password)) {
        res.render("login", { title: "Login Page", error: "Invalid username or password" });
        return;
      }

      const sessionId = crypto.randomBytes(16).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      db.prepare(sql`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`).run(
        sessionId,
        user.id,
        expiresAt.toISOString(),
      );

      res.setHeader(
        "Set-Cookie",
        `sessionId=${sessionId}; Expires=${expiresAt.toUTCString()}; HttpOnly; Path=/`,
      );
      res.writeHead(302, { Location: "/" });
      res.end();
    });
    return;
  }
}

function registerController(req: Request, res: Response) {
  const method = req.method;

  if (method === "GET") {
    res.render("register", { title: "Register Page" });
    return;
  }

  if (method === "POST") {
    let body = "";
    req.on("data", (chunk) => void (body += chunk.toString()));
    req.on("end", () => {
      const formData = new URLSearchParams(body);
      const username = formData.get("username");
      const password = formData.get("password");
      const hashedPassword = hashPassword(password!);

      let userId: number | bigint;
      try {
        userId = db
          .prepare("INSERT INTO users (username, password) VALUES (?, ?)")
          .run(username, hashedPassword).lastInsertRowid;
      } catch (error) {
        res.render("register", { title: "Register Page", error: error.message });
        return;
      }

      const sessionId = crypto.randomBytes(16).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      db.prepare(sql`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`).run(
        sessionId,
        userId,
        expiresAt.toISOString(),
      );

      res.setHeader(
        "Set-Cookie",
        `sessionId=${sessionId}; Expires=${expiresAt.toUTCString()}; HttpOnly; Path=/`,
      );
      res.writeHead(302, { Location: "/" });
      res.end();
    });
    return;
  }
}

function logoutController(req: Request, res: Response) {
  const sessionId = req.cookies.sessionId;

  if (sessionId) {
    db.prepare(sql`DELETE FROM sessions WHERE id = ?`).run(sessionId);
  }

  res.setHeader(
    "Set-Cookie",
    `sessionId=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Path=/`,
  );
  res.writeHead(302, { Location: "/" });
  res.end();
}

/**
 * init
 */
bootstrap();
