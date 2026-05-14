Feature: Reader Images
  As a reader
  I want images to stay within the readable area and open in fullscreen on tap
  So that I can view images clearly without losing context

  Background:
    Given I upload an EPUB with an image
    And I open the book from the library

  Scenario: Image stays within the readable area
    Then the image should be contained within the readable area

  Scenario: Clicking an image opens fullscreen viewer
    When I click on the image in the reader
    Then the image fullscreen should be visible
    And the fullscreen image should have the same source as the inline image

  Scenario: Tapping the fullscreen closes it
    When I click on the image in the reader
    Then the image fullscreen should be visible
    When I tap on the fullscreen overlay
    Then the image fullscreen should be closed

  Scenario: Pinch-to-zoom increases image scale
    When I click on the image in the reader
    Then the image fullscreen should be visible
    When I pinch to zoom on the image
    Then the image should be zoomed in
