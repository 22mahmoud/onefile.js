import type { Props } from "./server";

const html = (strings: TemplateStringsArray, ...values: any[]): string => {
  return String.raw({ raw: strings }, ...values);
};

const nav = ({ user }: { user: any }) => html`
  <nav>
    <a href="/">Home</a>
    ${user
      ? `<a href="/logout">Logout</a>`
      : `<a href="/login">Login</a>
         <a href="/register">Register</a>`}
  </nav>
`;

export const template = <T extends Props>({
  children,
  data,
}: {
  data: T;
  children: (x: T) => string;
}) =>
  html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${data.title}</title>
        <link rel="stylesheet" href="/styles.css" />
        <meta name="description" content="this is a dummy description" />

        <meta property="og:title" content="" />
        <meta property="og:type" content="" />
        <meta property="og:url" content="" />
        <meta property="og:image" content="" />
        <meta property="og:image:alt" content="" />

        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="icon.png" />

        <!-- <link rel="manifest" href="site.webmanifest" /> -->
        <meta name="theme-color" content="#fafafa" />
      </head>
      <body>
        ${nav({ user: data.user })}
        <main>${children(data)}</main>
        <form action="https://duckduckgo.com">
          <input type="text" name="q" placeholder="Search" />
          <input type="hidden" name="sites" value="maw.sh" />
          <button type="submit">Search</button>
        </form>
        <script src="/vendor/alpine.min.js"></script>
        <script src="/vendor/htmx.min.js"></script>
        <script src="/app.js"></script>
      </body>
    </html>`;

export const home = ({ user }: { user: Props["user"] }) =>
  html`<h1>Welcome Home</h1>
    <div x-data="{counter: 0}">
      <button @click="counter++" x-text="counter"></button>
    </div>
    ${user ? `<p>Hello, ${user.username}!</p>` : `<p>Please log in or register.</p>`}`;

export const login = ({
  form = { password: "", username: "" },
  error,
}: {
  error: string;
  form?: { username: string; password: string };
}) =>
  html`<form action="/login" method="post">
    <input
      value="${form?.username}"
      id="username"
      name="username"
      type="text"
      required
      placeholder="your username"
    />
    <input
      value="${form?.password}"
      id="password"
      name="password"
      type="password"
      required
      placeholder="***********"
    />
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
