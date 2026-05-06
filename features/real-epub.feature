Feature: Real EPUB Upload
  As a developer
  I want to verify that a real EPUB file uploads successfully
  So that the application handles real-world files correctly

  Scenario: Upload Crime and Punishment real EPUB
    Given the library page is open
    And the database is cleared
    When I upload "crime-punishment-real.epub" via the file chooser button
    Then the book should appear in the library
