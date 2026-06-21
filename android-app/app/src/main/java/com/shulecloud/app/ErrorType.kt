package com.shulecloud.app

/** Error states with their custom page title/message. Each page offers Retry. */
enum class ErrorType(val titleRes: Int, val messageRes: Int) {
    NO_INTERNET(R.string.err_no_internet_title, R.string.err_no_internet_msg),
    SERVER_UNAVAILABLE(R.string.err_server_unavailable_title, R.string.err_server_unavailable_msg),
    NOT_FOUND(R.string.err_404_title, R.string.err_404_msg),
    SERVER_ERROR(R.string.err_500_title, R.string.err_500_msg),
    SSL_ERROR(R.string.err_ssl_title, R.string.err_ssl_msg),
}
