Feature: Reader Next Chapter Position Bug
  As a developer
  I want to verify that navigating forward from a previous chapter
  opens the next chapter at the beginning (position 0) not at a saved position

  Background:
    Given the library page is open
    And a book "crime-punishment.epub" is uploaded
    And I open the book in the reader

  Scenario: From chapter N-1 end, next page opens chapter N at position 0
    When I open the TOC and select chapter 2
    Then the URL should show chapter 2
    When I scroll to the beginning of the current chapter
    And I tap the left zone to go back
    Then the URL should show chapter 1
    And the progress should be near 100%
    When I tap the right zone to go forward
    Then the URL should show chapter 2
    And the progress should be near 0%
