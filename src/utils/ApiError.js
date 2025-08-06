class ApiError extends Error {
    constructor(
        statusCode,
        message=  "Something went Worng",
        errors=[],
        statck= ''
    ){super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors
    }
}