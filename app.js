const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const format = require("date-fns/format");
const isValid = require('date-fns/isValid')

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined &&
    requestQuery.status !== undefined &&
    requestQuery.category !== undefined 
  );
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category} = request.query;

    if (status !== undefined) {
      if (!(status === "TO DO" || status === "IN PROGRESS" || status === "DONE")) {
        response.status(400);
        response.send("Invalid Todo Status");
        return;
      }
    }
  if (priority !== undefined) {
    if (!(priority === "HIGH" || priority === "LOW" || priority === "MEDIUM")) {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }

  if (category !== undefined) {
    if (!(category === "WORK" || category === "HOME" || category === "LEARNING")) {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }
 
  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}'
        AND category = '${category}'`;
      break;
    case hasPriorityProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
      break;
    case hasStatusProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
      break;
    case hasCategoryProperty(request.query):
      getTodosQuery = `
        SELECT 
        * 
        FROM 
        todo 
        WHERE 
        todo LIKE '%${search_q}%' 
        AND category = '${category}';`;
      break;
    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
  }

  data = await database.all(getTodosQuery);
  response.send(data);
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query
  if (date !== undefined) {
    date_split = date.split("-");
    Due_Date = date_split[0] + '-' + String(date_split[1]).padStart(2,0) + '-' + String(date_split[2].padStart(2,0))
  } else {
    response.status(400);
    response.send("Cannot get");
    return
  }
  console.log(Due_Date)
  getTodosQuery = `
        SELECT 
        * 
        FROM 
        todo 
        WHERE 
        due_date = '${Due_Date}';`;
  const result = await database.get(getTodosQuery);
  response.send(result);
});  


app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  response.send(todo);
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, due_date } = request.body;
  if (status !== undefined) {
    if (!(status === "TO DO" || status === "IN PROGRESS" || status === "DONE")) {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }
  if (priority !== undefined) {
    if (!(priority === "HIGH" || priority === "LOW" || priority === "MEDIUM")) {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }
  if (category !== undefined) {
    if (!(category === "WORK" || category === "HOME" || category === "LEARNING")) {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }
  const postTodoQuery = `
  INSERT INTO
    todo (id, todo, priority, status, category, due_date)
  VALUES
    (${id}, '${todo}', '${priority}', '${status}', '${category}', '${due_date}');`;
  await database.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      if (!(requestBody.status === "TO DO" || requestBody.status === "IN PROGRESS" || requestBody.status === "DONE")) {
        response.status(400);
        response.send("Invalid Todo Status");
        return;
      }
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      if (!(requestBody.priority === "HIGH" || requestBody.priority === "LOW" || requestBody.priority === "MEDIUM")) {
        response.status(400);
        response.send("Invalid Todo Priority");
        return;
    }
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      if (!(requestBody.category === "WORK" || requestBody.category === "HOME" || requestBody.category === "LEARNING")) {
        response.status(400);
        response.send("Invalid Todo Category");
        return;
      }
      break;
    case requestBody.due_date !== undefined:
      updateColumn = "dueDate";
      break;
  }
  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    due_date = previousTodo.due_date,
  } = request.body;

  const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category = '${category}';
    WHERE
      id = ${todoId};`;

  await database.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});


module.exports = app;