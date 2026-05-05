<?php

namespace Malipo\Exceptions;

use Exception;

class MalipoException extends Exception
{
    protected $statusCode;
    protected $errorCode;
    protected $details;

    public function __construct(string $message, int $statusCode = 0, ?string $errorCode = null, array $details = [])
    {
        parent::__construct($message);
        $this->statusCode = $statusCode;
        $this->errorCode = $errorCode;
        $this->details = $details;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getErrorCode(): ?string
    {
        return $this->errorCode;
    }

    public function getDetails(): array
    {
        return $this->details;
    }
}
