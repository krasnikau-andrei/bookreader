Feature: Reader Menu Gestures
  As a reader
  I want the overlay and TOC to close when I interact with them
  So that I can dismiss menus without accidentally turning pages

  Background:
    Given a book "crime-punishment.epub" is uploaded
    And I open the book in the reader

  Scenario: Tap closes overlay instead of turning page
    Given the overlay is open
    When I tap the right zone
    Then the overlay should close
    And the page should not turn

  Scenario: Swipe closes overlay instead of turning page
    Given the overlay is open
    When I swipe left
    Then the overlay should close
    And the page should not turn

  Scenario: Tap closes TOC instead of turning page
    Given the TOC is open
    When I tap outside the TOC panel
    Then the TOC should close
    And the page should not turn

  Scenario: Swipe closes TOC instead of turning page
    Given the TOC is open
    When I swipe left
    Then the TOC should close
    And the page should not turn

  Scenario: Selecting a chapter from TOC hides TOC
    Given the TOC is open
    When I select the second chapter
    Then the TOC should close
    And the overlay should also close
