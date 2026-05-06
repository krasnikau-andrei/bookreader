Feature: Subchapter Page Breaks
  As a reader
  I want subchapters to start on new pages (columns)
  So that the content is properly organized

  Scenario: Subchapter elements are marked with subchapter-start class
    When I create and upload an EPUB with subchapters
    And I open the book in the reader
    Then subchapter headings should have the "subchapter-start" class

  Scenario: Subchapters start on new columns
    When I create and upload an EPUB with subchapters
    And I open the book in the reader
    Then each subchapter heading should be at the start of a column
    And subchapters should be in different columns
