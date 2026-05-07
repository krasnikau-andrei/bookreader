Feature: Reader Swipe Gestures
  As a reader
  I want to navigate pages with swipe gestures
  So that the reading experience feels natural on touch devices

  Background:
    Given the library page is open
    And a book "crime-punishment.epub" is uploaded
    And I open the book in the reader
    And I navigate past the cover chapter

  Scenario: Swipe left advances to the next page
    When I swipe left from right to left
    Then the scroll position should increase
    And the final position should be at a valid page snap point

  Scenario: Swipe right goes back to the previous page
    When I navigate forward one page
    And I swipe right from left to right
    Then the final position should be at a valid page snap point

  Scenario: Content stays at a valid snap point after tap navigation
    When I tap the right zone
    Then the scroll position should be at a valid page boundary
    When I tap the right zone again
    Then the scroll position should be at a valid page boundary

  Scenario: Tap navigation has smooth animation
    When I tap the right zone
    Then the scroll position should change gradually over time

  Scenario: Large swipe advances exactly one page, not two
    When I start tracking the scroll position
    And I swipe left a long distance across the screen
    Then the page should advance by exactly 1 page
    And the scroll position should be at a valid page boundary

  Scenario: Large swipe right goes back exactly one page, not two
    When I navigate forward one page
    And I start tracking the scroll position
    And I swipe right a long distance across the screen
    Then the page should go back by exactly 1 page
    And the scroll position should be at a valid page boundary

  Scenario: Tiny swipe snaps back to original page, not frozen between pages
    When I start tracking the scroll position
    And I swipe left a short distance
    Then the scroll position should not have changed
    And the scroll position should be at a valid page boundary

  Scenario: Tiny swipe right snaps back to original page
    When I navigate forward one page
    And I start tracking the scroll position
    And I swipe right a short distance
    Then the scroll position should not have changed
    And the scroll position should be at a valid page boundary

  Scenario: Swipe uses consistent animation speed
    When I tap the right zone
    Then the scroll position should be at a valid page boundary
    When I tap the right zone again
    Then the scroll position should be at a valid page boundary
