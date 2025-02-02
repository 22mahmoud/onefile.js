import path from "node:path";
import fs from "node:fs";
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

/**
 * Utils
 */
function getTemplate() {
  try {
    const content = fs.readFileSync("index.html", "utf8");
    const regex = /<div\s+data-template=["']true["']\s*>([\s\S]*?)<\/div>/i;
    const [_, template] = content.match(regex) ?? [];

    if (!template) {
      throw new Error('Template not found! Add a div with data-template="true"');
    }

    return template.trim();
  } catch (err) {
    console.error("Error parsing template:", err);
    return "{{content}}";
  }
}

function getPages() {
  try {
    const content = fs.readFileSync("index.html", "utf8");
    const pages = {};
    const regex = /<div\s+data-page=["']([^"']+)["'].*?>([\s\S]*?)<\/div>/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const [_, page, content] = match;
      pages[page] = content.trim();
    }
    return pages;
  } catch (err) {
    console.error("Error parsing pages:", err);
    return {};
  }
}

function renderTemplate<T>(template: string, data: T) {
  return template.replace(/\{\{(\s*\w+\s*)\}\}/g, (_match, key) => {
    const trimmedKey = key.trim();
    return data[trimmedKey] || "";
  });
}

const template = getTemplate();
const pages = getPages();

function handleStatic(req: Request, res: Response) {
  if (!req.url) return false;

  const pathname = req.url;
  const validExtensions = [".css", ".js"];
  const ext = path.extname(pathname);

  if (!validExtensions.includes(ext)) return false;

  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, "");

  try {
    const content = fs.readFileSync(path.join(".", safePath));

    res.writeHead(200, {
      "Content-Type": ext === ".css" ? "text/css" : "text/javascript",
    });
    res.end(content);
    return true;
  } catch (err) {
    return false;
  }
}

const server = http.createServer((req, res) => {
  if (!req.url) return;
  if (handleStatic(req, res)) return;
  const pathname = req.url;

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

server.listen(PORT, HOST_NAME, () => {
  console.log(`Server is up & running on http://${HOST_NAME}:${PORT}!!`);
});
