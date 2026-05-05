class MalipoError(Exception):
    """Base error for all Malipo SDK errors"""
    def __init__(self, message: str, status_code: int = None, code: str = None, details: dict = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details

    def __str__(self):
        return f"{self.message} (status: {self.status_code}, code: {self.code})"
