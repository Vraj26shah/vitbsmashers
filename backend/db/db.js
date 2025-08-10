import mongoose  from "mongoose";

function Connect(){
    mongoose.connect(process.env.MONGO_URL).then(()=>{
        console.log("connected to mongoDB");

    }).catch(err =>{
        console.log(err);
    })
}

export default Connect;