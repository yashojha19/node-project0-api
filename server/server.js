
require('./config/config')

const _ = require('lodash')
const express = require('express')
const bodyParser = require('body-parser')
const {ObjectID} = require('mongodb')
var {mongoose} = require("./db/mongoose")

var {Todo} = require('./models/todo')
var {User} = require('./models/user')
var {authenticate} = require('./middleware/authenticate')
//https://calm-citadel-86301.herokuapp.com/
var app = express()
const port = process.env.PORT || 3000;


app.use(bodyParser.urlencoded({
    extended: true
  }));

app.use(bodyParser.json())
 
//post api for /todos route
app.post('/todos',authenticate,(req,res)=>{

    console.log(req.body)

    var todo = new Todo({
        text:req.body.text,
        _creator:req.user._id
    })

    todo.save().then((doc)=>{
        res.send(doc)
    })
    .catch((err)=>{
        res.status(400).send(err)
    })
})

//making get api for /todos route to get all todos created by that user
app.get('/todos',authenticate,(req,res)=>{
    Todo.find({
        _creator:req.user._id
    }).then((todos)=>{
        res.send({todos})
    }).catch((e)=>{
        res.status(400).send(e);
    })
})

//making get api for /todos for perticular todo
app.get('/todos/:id',authenticate,(req,res)=>{
    //res.send(req.params);
    let id = req.params.id
    if(ObjectID.isValid(id)){
        Todo.findOne({_id:req.params.id,_creator:req.user._id}).then((todo)=>{
            if(!todo){
                return  res.status(400).send({ERROR:"ID DOES'NT EXISTS"})
            }
            console.log("TODO:",todo);
            res.send({todo})
        }).catch((err)=>{
            console.log("ERROR",err)
        })
    }else{
        console.log("Object ID is not valid.")
        res.status(400).send({ERROR:"ID NOT VALID"})
    }
    
})

//making an api for /todos to delete any todo
app.delete('/todos/:id',authenticate,(req,res)=>{
    //get the id
    let id = req.params.id
    if(!ObjectID.isValid(id)){
        return res.status(404).send("Error: id is not in correct format")
    }   
        Todo.findOneAndRemove({
            _id:id,
            _creator:req.user._id
        }).then((todo)=>{
           if(!todo){
               return res.status(404).send("Error: there is no todo for this id.")
           }
           console.log("TODO Removed:",todo)
           res.send({todo})
        }).catch((err)=>{
            return res.status(400).send()
            console.log('Error:',err)
        })
})

//making an api for /todos to update any todo item.
app.patch('/todos/:id',authenticate,(req,res)=>{
    let id = req.params.id;
    let body = _.pick(req.body,['text','completed'])

    if(!ObjectID.isValid(id)){
        return res.status(404).send()
    }

    if(_.isBoolean(body.completed) && body.completed){ // if completed is a boolean and its true.
        body.completedAt = new Date().getTime();
    }else { 
        body.completed = false;
        body.completedAt = null; 
    }

    Todo.findOneAndUpdate(
        {_id:id,_creator:req.user._id},{$set:body},{new:true}).then((todo)=>{ //new true means it should return the updated item not the original one. 
            if(!todo){
                return res.status(404).send('todo item not found.')
            }
            res.send({todo})

        }).catch((err)=>{
            res.status(400).send('bad request')
        })

});

//making an api for /users to add a user.
app.post('/users',(req,res)=>{
    let body = _.pick(req.body,['email','password'])
    

        let user = new User(body)

        user.save().then((user_res)=>{
            user.generateAuthToken().then((token)=>{
                res.header('x-auth',token).send(user_res)
            }).catch((err)=>{
                res.status(400).send(err);
            })
        })
        .catch((err)=>{
            res.status(400).send(err)
        })
    
})

// it is a private route, it uses x-auth token in header in order to be successful. 
// the implementation of that is done in authenticate middleware.

app.get('/users/me',authenticate,(req,res)=>{
    res.send(req.user)
})


//login api for the users 
app.post('/login',(req,res)=>{
    
    let body = _.pick(req.body,['email','password'])

    User.findByCredentials(body.email,body.password).then((user)=>{
            // res.send(user);
            return user.generateAuthToken().then((token)=>{ 
                        res.header('x-auth',token).send(user)
                    }).catch((err)=>{
                        res.status(400).send(err);
            })
        }).catch((err)=>{
            res.status(400).send(err);
    })
   
})

//loging out i.e. deleting the token from tokens array of the user document.
app.delete('/users/me/token',authenticate,(req,res)=>{
    req.user.removeToken(req.token).then(()=>{
        res.status(200).send()
    }).catch((err)=>{
        res.status(400).send()
    })
})


app.listen(port,()=>{
    console.log(`Started on port ${port}`);

})

module.exports={app}