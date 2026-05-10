Feature: Book Progress
  As a reader
  I want to see my reading progress across the whole book
  So that I know how much I've read

  Background:
    Given the library page is open

  Scenario: Unread book shows no progress on card
    When I upload "crime-punishment.epub" via file input
    Then the book card should not show a progress bar

  Scenario: Progress bar appears at bottom of reader
    When I upload "crime-punishment.epub" via file input
    And I open the book in the reader
    Then a progress bar should be visible at the bottom of the reader
    And the reader progress should show "0%"

  Scenario: Navigating forward increases progress
    When I upload "crime-punishment.epub" via file input
    And I open the book in the reader
    When I navigate forward through the content
    Then the progress percentage should increase

  Scenario: Library card shows progress after reading
    When I upload "crime-punishment.epub" via file input
    And I open the book in the reader
    And I navigate to chapter 2
    When I go back to the library
    Then the book card should show a progress bar
    And the card progress should be greater than 0%

  Scenario: Progress persists across sessions
    When I upload "crime-punishment.epub" via file input
    And I open the book in the reader
    And I navigate to chapter 2
    When I close the book and reopen it
    Then a progress bar should be visible at the bottom of the reader
    And the reader progress should match the saved position

  Scenario: Progress bar has chapter segments
    When I upload "crime-punishment.epub" via file input
    And I open the book in the reader
    Then the progress bar should contain chapter segments
