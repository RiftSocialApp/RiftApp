package apperror

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/jackc/pgx/v5/pgconn"
)

type AppError struct {
	Code    int
	Message string
	Err     error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

func New(code int, message string) *AppError {
	return &AppError{Code: code, Message: message}
}

func Wrap(code int, message string, err error) *AppError {
	return &AppError{Code: code, Message: message, Err: err}
}

var (
	ErrNotFound      = New(http.StatusNotFound, "not found")
	ErrForbidden     = New(http.StatusForbidden, "forbidden")
	ErrBadRequest    = New(http.StatusBadRequest, "bad request")
	ErrUnauthorized  = New(http.StatusUnauthorized, "unauthorized")
	ErrConflict      = New(http.StatusConflict, "conflict")
	ErrInternal      = New(http.StatusInternalServerError, "internal error")
)

func NotFound(msg string) *AppError {
	return New(http.StatusNotFound, msg)
}

func Forbidden(msg string) *AppError {
	return New(http.StatusForbidden, msg)
}

func BadRequest(msg string) *AppError {
	return New(http.StatusBadRequest, msg)
}

func Conflict(msg string) *AppError {
	return New(http.StatusConflict, msg)
}

func Internal(msg string, err error) *AppError {
	return Wrap(http.StatusInternalServerError, msg, err)
}

func HTTPCode(err error) int {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.Code
	}
	return http.StatusInternalServerError
}

func Message(err error) string {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.Message
	}
	return "internal error"
}

func IsDuplicateKey(err error, constraint string) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505" && (constraint == "" || pgErr.ConstraintName == constraint)
	}
	return false
}
