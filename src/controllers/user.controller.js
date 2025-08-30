import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"

const registerUser = asyncHandler(async (req, res)=> {


    const {fullname, email, username, password} = req.body
    console.log("email", email);

    if([fullname, email, password, username].some((field) => 
        field?.trime() === "")){
            throw new ApiError(400, "All fields are required")        
    }

})

export {registerUser}