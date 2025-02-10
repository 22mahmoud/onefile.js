import type { Props } from "./server";

const html = (strings: TemplateStringsArray, ...values: any[]): string => {
  return String.raw({ raw: strings }, ...values);
};

export const template = <T extends Props>({
  children,
  data,
}: {
  data: T;
  children: (x: T) => string;
}) =>
  html`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${data.title}</title>
        <link rel="stylesheet" href="/styles.css" />
        <meta name="description" content="" />

        <meta property="og:title" content="" />
        <meta property="og:type" content="" />
        <meta property="og:url" content="" />
        <meta property="og:image" content="" />
        <meta property="og:image:alt" content="" />

        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="icon.png" />

        <link rel="manifest" href="site.webmanifest" />
        <meta name="theme-color" content="#fafafa" />
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          ${data.user
            ? `<a href="/logout">Logout</a>`
            : `<a href="/login">Login</a>
               <a href="/register">Register</a>`}
        </nav>
        <main>${children(data)}</main>
        <script src="/app.js"></script>
      </body>
    </html>`;

export const home = ({ user }: { user: Props["user"] }) =>
  html`<h1>Welcome Home</h1>
    ${user ? `<p>Hello, ${user.username}!</p>` : `<p>Please log in or register.</p>`}`;

export const login = ({ error }: { error: string }) =>
  html`<form action="/login" method="post">
    <input id="username" name="username" type="text" required placeholder="your username" />
    <input id="password" name="password" type="password" required placeholder="***********" />
    <input type="submit" value="Login" />
    ${error ? `<p class="error">${error}</p>` : ""}
  </form>`;

export const register = ({ error }: { error: string }) =>
  html`<form action="/register" method="post">
    <input id="username" name="username" type="text" required placeholder="your username" />
    <input id="password" name="password" type="password" required placeholder="***********" />
    <input type="submit" value="Register" />
    ${error ? `<p class="error">${error}</p>` : ""}
  </form>`;
