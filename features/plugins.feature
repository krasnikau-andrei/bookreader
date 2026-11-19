Feature: Plugins
  As a reader
  I want to add plugins without worrying what they do behind my back
  So that a plugin can only do what I allowed

  Background:
    Given the database is cleared

  Scenario: A friend's reading position shows on the progress bar and in the text
    Given a reading server where "Аня" reads "test-reader.epub" in chapter 2 at 50% of its text
    When I upload "test-reader.epub" via file chooser and open it
    And I open the plugins sheet
    And I install the built-in plugin "Читаем вместе"
    And I set the plugin field "server" to the reading server
    Then the plugin asks to reach the reading server
    When I allow the plugin to reach the server
    And I add the key of "Аня" to the plugin's friends
    Then the plugin shows "Аня — глава 2"
    And my reading position reaches the server
    When I close the plugins sheet
    Then a marker for "Аня" sits in chapter 2 of the progress bar
    When I go to chapter 2
    Then a line for "Аня" is drawn over the text

  Scenario: A plugin cannot get out of its sandbox
    Given I watch for requests to "leak.test"
    When I upload "test-reader.epub" via file chooser and open it
    And I open the plugins sheet
    And I install the plugin file "plugins/leaky.plugin.js"
    Then every escape attempt by the plugin failed
    And the plugin asks to reach "leak.test"
    And no request went to "leak.test"
