# Lens Manual: backend

REST API for a lens manual aimed at an optician chain. The idea is to make it easier to look up lens products and their limits when selling and ordering. Built as a course project (DT190G, Mid Sweden University) with the MEAN stack.

This is the backend. The Angular frontend lives in [lensmanual-frontend](https://github.com/J-manLans/lensmanual-frontend).

## Stack

- Node.js 20, Express 4
- MongoDB through Mongoose
- `cors` and `dotenv`

## What it does

The API is versioned under `/api/v1` and has three resources.

| Resource | Base path | Endpoints |
|---|---|---|
| Lenses | `/api/v1/lenses` | `GET /`, `GET /:lensName/:lensQuality`, `POST /`, `PATCH /:lensName/:lensQuality`, `DELETE /:lensName/:lensQuality` |
| Diameter and strength bounds | `/api/v1/lenses/diameters` | `GET /`, `GET /:lensType/:lensQuality`, `PATCH /:lensType/:lensQuality` |
| Indexes | `/api/v1/lenses/indexes` | `GET /` |

A lens is identified by its name and quality together. That pair is unique, so the same lens name can exist at several quality levels. A lens holds its type, manufacturing type (`RX` or `STOCK`), treatments, correction details and per-index data. Reading a lens combines it with the matching diameter and strength bounds, and with the index values from the indexes collection.

The `.http` files in the repo (`lenses.http`, `diameterStrengthBounds.http`, `indexes.http`) are request examples with the expected status codes. They work with the VS Code REST Client extension.

## Running it locally

You need Node 20 and a MongoDB database you can connect to.

1. Install the dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:

   ```
   DB_SERVER=mongodb://localhost:27017/lensmanual
   PORT=3000
   ```

   `DB_SERVER` is required, and the server exits if it is missing. `PORT` is optional and defaults to 3000. The `.env` file is git-ignored.

3. Start the server:

   ```bash
   node app.js
   ```

   The API is then available at `http://localhost:3000/api/v1`.

The repository does not include a database or seed data, so the API starts empty. Add lenses through `POST /api/v1/lenses` (the `.http` files have example requests), or directly in MongoDB.

## Project layout

```
app.js                 Entry point: database connection, middleware, routes
app/model/             Mongoose models (Lens, Index, DiameterStrengthBounds)
routes/v1/             Route handlers for each resource
*.http                 Request examples
```

## Limitations

This was a course project, where learning the concepts and scoping the work was part of the assignment, and the code reflects that. It is not production code. Known shortcomings:

- **No authentication.** Every endpoint is open, including the ones that change or delete data, and CORS allows any origin.
- **No referential integrity.** Lenses, indexes and diameter bounds are linked by name, not by database references, so nothing stops a lens from naming an index that does not exist.
- **No automated tests.** The `.http` files are manual request examples.
- **No seed data.** The API starts empty.
- **Course leftovers.** Package names and the repository link in `package.json` still point at the course setup.

## Status

A finished course project, left as it was when the course ended. It has not been maintained since, so the setup may need small fixes to run today (the frontend still points at a course server that no longer exists). I may pick it up again someday.
