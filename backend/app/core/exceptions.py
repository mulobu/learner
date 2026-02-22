from uuid import UUID


class LearnerException(Exception):
    """Base exception for the application."""

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class BookNotFoundError(LearnerException):
    def __init__(self, book_id: UUID):
        super().__init__(f"Book {book_id} not found", status_code=404)


class UnitNotFoundError(LearnerException):
    def __init__(self, unit_id: UUID):
        super().__init__(f"Unit {unit_id} not found", status_code=404)


class QuizNotFoundError(LearnerException):
    def __init__(self, unit_id: UUID):
        super().__init__(f"No quiz found for unit {unit_id}", status_code=404)


class AttemptNotFoundError(LearnerException):
    def __init__(self, attempt_id: UUID):
        super().__init__(f"Quiz attempt {attempt_id} not found", status_code=404)


class DuplicateBookError(LearnerException):
    def __init__(self, filename: str):
        super().__init__(f"Book '{filename}' already uploaded", status_code=409)


class NoTOCFoundError(LearnerException):
    def __init__(self, filename: str):
        super().__init__(
            f"No table of contents found in '{filename}'", status_code=422
        )


class PDFProcessingError(LearnerException):
    def __init__(self, detail: str):
        super().__init__(f"PDF processing failed: {detail}", status_code=422)


class LLMServiceError(LearnerException):
    def __init__(self, detail: str):
        super().__init__(f"LLM service error: {detail}", status_code=502)


class VideoSearchError(LearnerException):
    def __init__(self, detail: str):
        super().__init__(f"Video search error: {detail}", status_code=502)


class UnitAlreadyProcessingError(LearnerException):
    def __init__(self, unit_id: UUID):
        super().__init__(
            f"Unit {unit_id} is already being processed", status_code=409
        )


class UnitAlreadyProcessedError(LearnerException):
    def __init__(self, unit_id: UUID):
        super().__init__(
            f"Unit {unit_id} has already been processed", status_code=409
        )


class InvalidFileError(LearnerException):
    def __init__(self, detail: str):
        super().__init__(detail, status_code=422)


class UserAlreadyExistsError(LearnerException):
    def __init__(self, email: str):
        super().__init__(f"User with email '{email}' already exists", status_code=409)


class InvalidCredentialsError(LearnerException):
    def __init__(self):
        super().__init__("Invalid email or password", status_code=401)


class UnauthorizedError(LearnerException):
    def __init__(self, detail: str = "Authentication required"):
        super().__init__(detail, status_code=401)


class ForbiddenError(LearnerException):
    def __init__(self, detail: str = "You do not have access to this resource"):
        super().__init__(detail, status_code=403)


class RateLimitExceededError(LearnerException):
    def __init__(
        self,
        detail: str = "Rate limit exceeded",
        retry_after_seconds: int | None = None,
    ):
        super().__init__(detail, status_code=429)
        self.retry_after_seconds = retry_after_seconds
