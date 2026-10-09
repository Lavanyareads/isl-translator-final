# SPARSH Test Cases

## TC01: Static Sign Recognition
Input: Any supported static sign.

Expected Result: The model identifies the sign correctly.

## TC02: Dynamic Sign Recognition
Input: Any supported dynamic sign performed in front of the camera.

Expected Result: The model identifies the dynamic sign correctly.

## TC03: No Hand Detected
Input: Camera feed without a visible hand.

Expected Result: The system handles the input without producing an invalid confident prediction.

## TC04: Sentence Formation
Input: A sequence of supported signs.

Expected Result: Recognized signs are added to the conversation message.

## TC05: English Translation
Input: A finalized sign sequence.

Expected Result: The system generates English text when the language-processing service succeeds.

## TC06: Marathi Translation
Input: An English message.

Expected Result: The system displays Marathi translation when the translation service succeeds.

## TC07: Camera Permission
Input: Camera access is denied.

Expected Result: The application handles camera unavailability appropriately.

## TC08: API Failure
Input: The translation service is unavailable.

Expected Result: The application handles the error without crashing.

## Test Results
Run each test and record the actual outcome as Passed or Failed. Do not mark tests as passed until verified.
