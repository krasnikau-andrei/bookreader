Feature: Reader
  As a reader
  I want to read books with smooth navigation and useful controls
  So that I can enjoy my reading experience

  Background:
    Given the library page is open

  Scenario: Opening a book navigates to the reader
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    Then the reader should be visible

  Scenario: Tapping center toggles the overlay
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    Then the overlay should be hidden
    When I tap the center of the page
    Then the overlay should be visible
    When I tap the center of the page again
    Then the overlay should be hidden

  Scenario: Left and right taps navigate between chapters
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    Then tapping the right zone should move through the content
    And tapping the left zone should navigate back

  Scenario: Text has sufficient contrast in the reader
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    Then the text should be visible with sufficient contrast

  Scenario: Content fills the viewport without leaking to the next page
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    And I navigate to a chapter with text content
    Then the content should fill at least 85% of the viewport width
    And the gap to the next page should be under 15%

  Scenario: Rapid taps at chapter boundary do not cause a stuck page
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    And I navigate near a chapter boundary
    When I rapidly tap the right zone 8 times
    Then the scroll position should be at a valid page boundary
    And the scroll position should not be stuck mid-scroll

  Scenario: Rapid taps center text properly on the final page
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    And I navigate to a chapter with text content
    When I rapidly tap the right zone 5 times
    Then the final scroll position should be at a valid page boundary
    And the visible text should be properly centered in the viewport

  Scenario: URL updates when turning pages
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    Then the URL should include chapter and progress parameters
    When I navigate forward through the content
    Then the URL chapter or progress should update
    When I navigate backward
    Then the URL should reflect the earlier position

  Scenario: URL includes chapter and progress params on initial load
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    Then the URL should have valid chapter and progress parameters

  Scenario: URL params restore position when reopening a book
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    And I navigate to a specific position
    When I save the URL params and navigate away
    And I reopen the book with those URL params
    Then the reader should restore to the saved chapter and progress

  Scenario: Shared URL progress overrides saved progress
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    When I navigate to a position and open with a shared URL
    Then the reader should open at the shared position

  Scenario: Text can be selected in the reader
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    And I navigate to a chapter with text content
    When I select text by dragging across it
    Then some text should be selected

  Scenario: TOC button appears in the overlay
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    When I tap the center to show the overlay
    Then the TOC button should be visible

  Scenario: TOC opens when clicking the TOC button
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    When I tap the center to show the overlay
    And I click the TOC button
    Then the TOC overlay should be visible
    And the TOC title should be shown

  Scenario: TOC navigates to the selected chapter
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    When I tap the center to show the overlay
    And I click the TOC button
    And I click on the second chapter in the TOC
    Then the TOC should close
    And the URL should update to the new chapter

  Scenario: TOC close button hides the TOC
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    When I tap the center to show the overlay
    And I click the TOC button
    And I click the close TOC button
    Then the TOC should not be visible

  Scenario: TOC displays all chapter titles
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    When I tap the center to show the overlay
    And I click the TOC button
    Then the TOC should list chapter titles
    And each chapter item should have text content

  Scenario: Saved position is restored when reopening a book
    When I upload "crime-punishment.epub" via file input
    And I open the book from the library
    And I navigate to chapter 2
    When I close the book and reopen it
    Then the reader should restore to chapter 2

  Scenario: TOC scrolls to current chapter when opened
    Given the library page is open
    And a book "crime-punishment.epub" is uploaded
    And I open the book in the reader
    When I navigate forward to a later chapter
    And I open the TOC
    Then the current chapter button should be visible in the TOC scrollable area
    And the current chapter should be centered in the TOC viewport
