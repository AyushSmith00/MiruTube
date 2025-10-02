import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uplaodOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()  
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}


    } 
    catch(error){
        throw new ApiError(500, "something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res)=> {


    const {fullName, email, username, password} = req.body

    if([fullName, email, password, username].some((field) => 
        field?.trim() === "")){
            throw new ApiError(400, "All fields are required")        
    }

    const exixtedUser = await User.findOne({
        $or: [{email},{username}]
    })

    if(exixtedUser){
        throw new ApiError(409, "User with same email or username already exixt")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalpath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalpath = req.files.coverImage[0].path
    }


    if(!avatarLocalPath){
        throw new ApiError(400, "Burh u need an Avator")
    }

    const avatar = await uplaodOnCloudinary(avatarLocalPath)
    const coverImage = await uplaodOnCloudinary(coverImageLocalpath)

    if(!avatar){
        throw new ApiError(400, "Burh u need an Avator")   
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500,"I apologies Someting went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})

const loginUser = asyncHandler(async(req, res) => {
    const {email, username, password} = req.body
    if(!username && !email){
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    
    if (!isPasswordValid) {
        throw new ApiError(404, "Give me the correct passsword")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200).cookie("accessToken", accessToken, options).
    cookie("refreshToken", refreshToken, options).json(
        new ApiResponse(
            200, {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )
     
})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200).clearCookie("accessToken", options)
    .clearCookie("refreshToken").json(new ApiResponse(200, {}, "user logged out Successfully"))
})

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user) {
            throw new ApiError(401, "Invalid refresh Token")}
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options).json(
            new ApiResponse(200,{accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh Token")
    }

})

const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Old Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200).json(
        new ApiResponse(200, {}, "Password Changed Successfully")
    )  
})

const getCurrentuser = asyncHandler(async(req,res) => {
    return res.status(200).json(
        200, req.user, "Current User Fetched Successfully"
    )
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email } = req.body 

    if(!fullName || email){
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "Account Details Updated Successfully"))
})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentuser,
    updateAccountDetails
}