package com.twogofindz.backend.exception;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.ValidationErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.mapping.PropertyReferenceException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.Nullable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.HashMap;
import java.util.Map;

/**
 * Central exception-to-HTTP-response translator.
 *
 * <p>Extends {@link ResponseEntityExceptionHandler} so that standard Spring MVC exceptions
 * (wrong HTTP method, malformed JSON, unsupported media type, unmapped paths, oversized multipart
 * uploads via {@code MaxUploadSizeExceededException}, etc.) are wrapped in this project's
 * {@link ApiResponse}/{@link ValidationErrorResponse} envelope with the correct HTTP status, instead
 * of falling through to a generic 500 or Spring's default HTML error page.
 * The single override point for all of those is {@link #handleExceptionInternal}.</p>
 *
 * <p><b>Note:</b> {@code MaxUploadSizeExceededException} is intentionally <em>not</em> given its own
 * {@code @ExceptionHandler} method here — as of Spring Framework 6.1 it is already resolved by the
 * base class's internal composite {@code handleException(Exception, WebRequest)} handler (it
 * implements {@link org.springframework.web.ErrorResponse} with a 413 status). Declaring a second,
 * separate {@code @ExceptionHandler} for the same exception type throws an "Ambiguous
 * {@code @ExceptionHandler} method" {@link IllegalStateException} at context startup. Its message is
 * customized via {@link #messageForStatus} (status 413) instead.</p>
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.failure(ex.getMessage()));
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiResponse<Void>> handleDuplicate(DuplicateResourceException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.failure(ex.getMessage()));
    }

    @ExceptionHandler(CategoryInUseException.class)
    public ResponseEntity<ApiResponse<Void>> handleCategoryInUse(CategoryInUseException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.failure(ex.getMessage()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.failure("Invalid username or password."));
    }

    @ExceptionHandler(AccountLockedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccountLocked(AccountLockedException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(ApiResponse.failure(ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.failure("You do not have permission to perform this action."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation", ex);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.failure("This operation conflicts with existing data."));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.failure("Invalid value for parameter '" + ex.getName() + "'."));
    }

    @ExceptionHandler(PropertyReferenceException.class)
    public ResponseEntity<ApiResponse<Void>> handlePropertyReference(PropertyReferenceException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.failure("Invalid sort field: '" + ex.getPropertyName() + "'."));
    }

    @ExceptionHandler(InvalidFileException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidFile(InvalidFileException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.failure(ex.getMessage()));
    }

    @ExceptionHandler(InvalidComparisonException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidComparison(InvalidComparisonException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.failure(ex.getMessage()));
    }

    @ExceptionHandler(InvalidImportFileException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidImportFile(InvalidImportFileException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.failure(ex.getMessage()));
    }

    @ExceptionHandler(InvalidBuyingGuideException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidBuyingGuide(InvalidBuyingGuideException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.failure(ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.failure("An unexpected error occurred. Please try again later."));
    }

    /**
     * Final fallback for every exception {@link ResponseEntityExceptionHandler} itself resolves
     * (wrong HTTP method, malformed JSON body, unsupported Content-Type, unmapped path, bean
     * validation failures on {@code @RequestBody}, etc.) so the response always uses this
     * project's envelope rather than Spring's default {@code ProblemDetail}/HTML error page.
     */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex, @Nullable Object body, HttpHeaders headers, HttpStatusCode statusCode, WebRequest request) {

        if (ex instanceof MethodArgumentNotValidException validationEx) {
            Map<String, String> errors = new HashMap<>();
            validationEx.getBindingResult().getFieldErrors().forEach(fieldError ->
                    errors.put(fieldError.getField(), fieldError.getDefaultMessage()));
            return ResponseEntity.status(statusCode).body(ValidationErrorResponse.of(errors));
        }

        return ResponseEntity.status(statusCode).body(ApiResponse.failure(messageForStatus(statusCode)));
    }

    private String messageForStatus(HttpStatusCode statusCode) {
        return switch (statusCode.value()) {
            case 400 -> "The request could not be understood. Please check the request body and try again.";
            case 404 -> "The requested resource was not found.";
            case 405 -> "This HTTP method is not supported for this endpoint.";
            case 415 -> "The specified Content-Type is not supported.";
            case 413 -> "Uploaded file exceeds the maximum allowed size.";
            default -> "The request could not be processed.";
        };
    }
}
