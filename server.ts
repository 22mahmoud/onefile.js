import path from "node:path";
import fs from "node:fs/promises";
import http from "node:http";

/**
 * Types
 */
type Response = http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage };
type Request = http.IncomingMessage;

/**
 * Constants
 */
const PORT = 5000;
const HOST_NAME = "127.0.0.1";
const HTML_FILE_NAME = "index.html";

/**
 * Globals
 */
let html: string;
let template: string;
let pages: Record<string, string>;

/**
 * Utils
 */
async function readHTML() {
  try {
    const content = await fs.readFile(HTML_FILE_NAME, "utf8");
    return content;
  } catch (error) {
    console.error("Error parsing template:", error);
    return "";
  }
}

function getTemplate(content: string = "{{content}}") {
  const regex = /<div\s+data-template=["']true["']\s*>([\s\S]*?)<\/div>/i;
  const [_, template] = content.match(regex) ?? [];

  if (!template) {
    throw new Error('Template not found! Add a div with data-template="true"');
  }

  return template.trim();
}

function getPages(content: string) {
  const pages = {};
  const regex = /<div\s+data-page=["']([^"']+)["'].*?>([\s\S]*?)<\/div>/gi;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const [_, page, content] = match;
    pages[page] = content.trim();
  }

  return pages;
}

function renderTemplate<T>(template: string, data: T) {
  return template.replace(/\{\{(\s*\w+\s*)\}\}/g, (_match, key) => {
    const trimmedKey = key.trim();
    return data[trimmedKey] || "";
  });
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
 * Bootstrap
 */
async function bootstrap() {
  html = await readHTML();
  template = getTemplate(html);
  pages = getPages(html);

  const server = http.createServer(async (req, res) => {
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

    res.writeHead(404);
    res.end();
  });

  server.listen(PORT, HOST_NAME, () => {
    console.log(`Server is up & running on http://${HOST_NAME}:${PORT}!!`);
  });
}

function homeController(req: Request, res: Response) {
  const method = req.method;

  if (method === "GET") {
    const content = pages["home"];
    const rendered = renderTemplate(template, { title: "Home", content });
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(rendered);
    return;
  }
}

function loginController(req: Request, res: Response) {
  const method = req.method;

  if (method === "GET") {
    const content = pages["login"];
    const rendered = renderTemplate(template, { title: "Login", content });
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(rendered);
    return;
  }

  if (method === "POST") {
    res.end("LOGIN!");
    return;
  }
}

function registerController(req: Request, res: Response) {
  const method = req.method;

  if (method === "GET") {
    const content = pages["register"];
    const rendered = renderTemplate(template, { title: "Register", content });
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(rendered);
    return;
  }

  if (method === "POST") {
    res.end("LOGIN!");
    return;
  }
}

/**
 * init
 */
bootstrap();
