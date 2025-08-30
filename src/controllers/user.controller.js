import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
const registerUser = asyncHandler(async (req, res)=> {


    const {fullname, email, username, password} = req.body
    console.log("email", email);

    if([fullname, email, password, username].some((field) => 
        field?.trime() === "")){
            throw new ApiError(400, "All fields are required")        
    }

    const exixtedUser = User.findOne({
        $or: [{email},{username}]
    })

    if(exixtedUser){
        throw new ApiError(409, "User with same email or username already exixt")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalpath = req.files?.coverImage[0]?.path;


    if(!avatarLocalPath){
        throw new ApiError(400, "Burh u need an Avator")
    }
})

export {registerUser}