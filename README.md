# daylog

![daylog_portrait](resources/readme_logo.png)

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DavidArtifacts_daylog&metric=alert_status&token=454f2e190f81f0af13315e8abff724843c1e5665)](https://sonarcloud.io/summary/new_code?id=DavidArtifacts_daylog)

✨ A board based note taking and markdown editor web app.

### Stable version

If you want to use the stable version of daylog, you can find it [here](https://github.com/DigitalArtifactory/daylog/releases). Keep in mind that main branch is always in development and may not be stable.

### Features

- **Self-Hosting:** daylog is a pure Next.js application, allowing you to host it on your own server or preferred hosting service.
- **Boards:** daylog is board-based, giving you the flexibility to organize notes by context, projects, or as folders.
- **Notes:** Your notes can be simple text or formatted using Markdown.
- **Editor:** daylog includes a Markdown editor with essential formatting options, perfect for beginners.
- **Search:** Easily find notes or boards with a single keyword using the built-in search feature.
- **Dark/Light mode:** daylog supports both dark and light modes, making it easy on the eyes.
- **Responsive design:** daylog is designed to be responsive and works well on both desktop and mobile devices.
- **Unsplash integration:** daylog includes a built-in image search feature using Unsplash, allowing you to easily find and insert images into your notes.
- **2FA:** daylog includes a built-in 2FA feature, allowing you to add an extra layer of security to your account.
- **S3 integration:** daylog includes a built-in s3 integration feature, allowing you to store your notes and boards uploaded images in a cloud storage service.

### Screenshots

![daylog_portrait](resources/readme_portrait_1.png)

![daylog_landscape](resources/readme_portrait_2.png)

### Production Installation (Docker Hub)

To install and run daylog in a production environment using docker, follow these steps:

1. **Create a docker network:**

```bash
docker network create daylog-net
```

2. **Run a postgres container:**

```bash
docker run -d \
--name daylog-db \
--network daylog-net \
-e POSTGRES_USER=postgres \
-e POSTGRES_PASSWORD=postgres \
-e POSTGRES_DB=daylog \
-v daylog_data:/var/lib/postgresql/data \
postgres:16
```

3. **Run daylog container:**

```bash
docker run -d \
 --name daylog \
 --network daylog-net \
 -p 3000:3000 \
 -v daylog_storage:/app/storage \
 -e DATABASE_URL=postgresql://postgres:postgres@daylog-db:5432/daylog?schema=public \
 -e ENVIRONMENT=production \
 -e STORAGE_PATH=/app/storage \
 davidartifacts/daylog:latest
```

### Production Installation (Docker Compose)

1. **Download docker-compose.yml file:**

```bash
wget https://github.com/digitalartifactory/daylog/releases/latest/download/docker-compose.yml
```

2. **Setup .env file:**

Download the .env.example file and rename it to .env.

```bash
wget https://github.com/digitalartifactory/daylog/releases/latest/download/default.env.example -O .env
```

You can keep the default values or you can change them.

3. **Run docker compose:**

```bash
docker compose up -d --build
```

### Production Installation (npm)

To install and run daylog in a production environment, follow these steps:

1. **Clone the repository:**

```bash
git clone https://github.com/DigitalArtifactory/daylog.git
cd daylog
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set up environment variables:**
   Copy `.env.example` and setup your own variables. **Important:** by default daylog uses PostgreSQL, you can change your conection string to any other database engine supported by Prisma ORM. You can follow their [guide](https://www.prisma.io/docs/orm/reference/connection-urls) to achieve this step.

4. **Initialize the Prisma database:**

```bash
npx prisma migrate deploy
npx prisma generate
```

6. **Build the application:**

```bash
npm run build
```

7. **Start the application:**

```bash
npm start
```

8. **(optional) Configure a process manager:**
   Use a process manager like PM2 to keep your application running:

```bash
npm install -g pm2
pm2 start npm --name "daylog" -- start
pm2 save
pm2 startup
```

9. **Set up a reverse proxy:**
   Configure a reverse proxy using Nginx or another web server to forward requests to your Node.js application.

10. **Secure your application:**
    Ensure your application is served over HTTPS and configure appropriate security headers.

Your daylog application should now be running in a production environment.

### Initial Setup

Go to `http://localhost:3000/register/init` to create an admin user.

After creating the admin user, you can log in using the credentials you just created.

Check the `.env` file to see the available environment variables.

### TODOs

- [x] Improve grammar 📖
- [x] Enhance MD editor 🖊
- [ ] Improve user security (data encryption, account recovery, email verification) 🔐
- [x] Create breadcrumbs navigation 🚢
- [ ] Create public link sharing option ✉
- [ ] Create shared boards 📰
- [x] Improve production deployment instructions 🛠
- [ ] And many more cool features in the future 🚀...

### Build with

- [NextJS](https://nextjs.org/)
- [Prisma ORM](https://www.prisma.io/)
- [Bootstrap](https://getbootstrap.com/)
- [Tabler UI](https://tabler.io/)
- [Marked](https://github.com/markedjs/marked)
- [Zod](https://github.com/colinhacks/zod)
- [Nodemailer](https://github.com/nodemailer/nodemailer)
- [Crypto](https://nodejs.org/api/crypto.html)
- [Sharp](https://github.com/lovell/sharp)

### External components

- [qrcode.react](https://github.com/zpao/qrcode.react)
- [relative-time-element](https://github.com/github/relative-time-element)
- [input-otp](https://github.com/guilhermerodz/input-otp)
- [react-md-editor](https://github.com/uiw/react-md-editor)
- [rehype-sanitize](https://github.com/rehypejs/rehype-sanitize)

### Local Development

To set up a local development environment for daylog, you can follow the same steps as Production but with this changes:

1. **Set up dev environment variable:**
   Change `ENVIRONMENT` variable to `'development'`

2. **Initialize the Prisma database:**

```bash
npx prisma deploy
```

4. **Run the development server:**

```bash
npm run dev
```

Your daylog application should now be running locally at `http://localhost:3000`.

### Running Tests

To run tests for the daylog application, use the following command:

```bash
npm run test
```

This will execute the test suite and provide feedback on the application's functionality.

### Disclaimer

This project is provided "as is" without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.

### License

This project is licensed under the Apache-2.0 License. See the [LICENSE](LICENSE) file for details.

### About The Author

Hi! I'm David, and I'm glad to have you in this repo. This is my first open-source project, and there's still a lot of work to do to enhance the user experience and implement new features I have in mind.

Feel free to use it as your personal note-taking app or share it with your friends, colleagues, and family. I’d truly appreciate any feedback to improve the code in this repo or any kind of collaboration.

### Donations

Money is not the best reward—your time and collaboration are. However, if you'd like to support me [(the author)](https://github.com/DavidArtifacts), you can make a donation to keep me motivated and hydrated (with some coffee, of course) at:

<a href="https://www.buymeacoffee.com/davidartifacts" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 30px !important;width: 109px !important;" ></a>

**Thank you!** ❤
