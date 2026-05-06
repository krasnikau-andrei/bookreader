Feature: Reader Previous Chapter Bug
  As a developer
  I want to verify that navigating to the previous chapter
  opens at the end (position ~100%) not at the beginning

  Background:
    Given the library page is open
    And a book "crime-punishment.epub" is uploaded
    And I open the book in the reader

  Scenario: Going back to the previous chapter opens at the end, not the beginning
    When I navigate forward to a deep chapter
    Then the current chapter should be at least 7
    When I scroll to the beginning of the current chapter
    And I tap the left zone to go back
    Then the URL should show the previous chapter
    And the progress should be greater than 90%
    And the scroll position should be at least 90% through the chapter
