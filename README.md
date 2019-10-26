# SocialDeck

SocialDeck is currently an API that enables users to manage their posts (Create, Read, Update, Delete, Share). It uses GraphQL, instead of REST because of the following reasons:
  - Declarative data fetching: there's no need to call multiple endpoints to access various data, like with traditional REST approach. Instead, you specify the exact data you need and GraphQL gives you exactly what you asked for.
  - Improved performance: GraphQL improves performance by helping avoid round trips to the server and reducing payload size. If one want to take advantage of GraphQL, they don't even have to scrape their existing REST API.
  - GraphQL was developed by Facebook and it's currently open-sourced. It's quickly gaining popularity. A few of its the most notable users are Airbnb, GitHub, The New York Times, Coursera.

This API was built using Node.js, Express and Apollo Server. The data is persisted in a cloud Mongo database (Atlas).
## Technologies used
* [apollo-server](https://www.npmjs.com/package/apollo-server) - Community-maintained open-source GraphQL server.
* [bcrypt](https://www.npmjs.com/package/bcrypt) - A library to help you hash passwords.
* [connect-mongo](https://www.npmjs.com/package/connect-mongo) - MongoDB session store for Connect and Express.
* [cookie-parser](https://www.npmjs.com/package/cookie-parser) - Parse Cookie header and populate req.cookies with an object keyed by the cookie names.
* [eslint](https://www.npmjs.com/package/eslint) - tool for identifying and reporting on patterns found in ECMAScript/JavaScript code.
* [node.js](https://nodejs.org/en/) - evented I/O for the backend
* [express](https://www.npmjs.com/package/express) - Fast, unopinionated, minimalist web framework for node.
* [express-session](https://www.npmjs.com/package/express-session) - Simple cookie-based session middleware.
* [graphql](https://www.npmjs.com/package/graphql) - A Query Language and Runtime which can target any service.
* [graphql-scalars](https://www.npmjs.com/package/graphql-scalars) - A library of custom GraphQL scalar types for creating precise type-safe GraphQL schemas.
* [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) - An implementation of JSON Web Tokens.
* [moment](https://www.npmjs.com/package/moment) - Parse, validate, manipulate, and display dates
* [mongoose](https://www.npmjs.com/package/mongoose) - Mongoose is a MongoDB object modeling tool designed to work in an asynchronous environment.
* [morgan](https://www.npmjs.com/package/morgan) - HTTP request logger middleware for node.js.


## Usage
In order to use the API, one has to login or signup, otherwise access to its data will be denied.
 ```
 mutation login {
  logIn(email: "user@gmail.com", password: "secret")
}

mutation signUp {
  signUp(
    email: "user@gmail.com"
    password: "secret"
    firstName: "George"
    lastName: "Washington"
  )
}
 ```
 
 After login or signup the user will have access to the following Queries and Mutations (the code snippet lists all the available fields to fetch, meaning the user doesn't have to request all the attributes if they don't need everything):
 ```
 mutation logOut {
  logOut
}

query users {
  users {
    _id
    email
    password
    firstName
    lastName
    posts {
      _id
      creatorID
      createdTime
      message
      updatedTime
      links
      shares
    }
  }
}

query findUserById {
  findUserById(_id: "5db3386383e66f23b3e566d5") {
    _id
    email
    password
    firstName
    lastName
    posts {
      _id
      creatorID
      createdTime
      message
      updatedTime
      links
      shares
    }
  }
}

mutation deleteUserById {
  deleteUserById(_id: "5db345f0a584872d59036fa9") {
    _id
    email
    password
    firstName
    lastName
    posts {
      _id
      creatorID
      createdTime
      message
      updatedTime
      links
      shares
    }
  }
}

mutation deleteAllUsers {
  deleteAllUsers
}

query me {
  me {
    _id
    email
    password
    firstName
    lastName
    posts {
      _id
      creatorID
      createdTime
      message
      updatedTime
      links
      shares
    }
  }
}

query posts {
  posts {
    _id
    creatorID
    createdTime
    message
    updatedTime
    links
    shares
  }
}

query findPostById {
  findPostById(_id: "5db338f6960a912528394e5b") {
    _id
    creatorID
    createdTime
    message
    updatedTime
    links
    shares
  }
}

mutation createPost {
  createPost(
    message: "My new post."
    links: [
      {
        url: "https://github.com/Urigo/graphql-scalars/blob/master/tests/URL.test.ts"
      }
      { url: "https://moodle.wit.ie" }
    ]
  ) {
    _id
    creatorID
    createdTime
    message
    updatedTime
    links
    shares
  }
}

mutation deletePostById {
  deletePostById(_id: "5daf57cad5e3df23241ba71e") {
    _id
    creatorID
    createdTime
    message
    updatedTime
    links
    shares
  }
}

mutation deleteAllPosts {
  deleteAllPosts
}

mutation sharePost {
  sharePost(postID: "5db34733a584872d59036fab") {
    _id
    creatorID
    createdTime
    message
    shares
  }
}

mutation updatePost {
  updatePost(
    postID: "5db34733a584872d59036fab"
    message: "This post was editted."
    links: [
      { url: "https://localhost:7000/graphql" }
      { url: "https://moodle.wit.ie/login/index.php" }
    ]
  ) {
    _id
    creatorID
    createdTime
    message
    updatedTime
    links
    shares
  }
}
```