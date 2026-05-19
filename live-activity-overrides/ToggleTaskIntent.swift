import AppIntents
import ActivityKit
import Foundation

struct ADHDDOTaskItem: Codable, Hashable {
  var text: String
  var done: Bool
}

@available(iOS 17.0, *)
struct ToggleTaskIntent: AppIntent {
  static var title: LocalizedStringResource = "Toggle task"
  static var description = IntentDescription("Toggle a task on the ADHD-DO lock-screen card.")
  static var isDiscoverable = false
  static var openAppWhenRun: Bool = false

  @Parameter(title: "Activity ID")
  var activityId: String

  @Parameter(title: "Task index")
  var taskIndex: Int

  init() {}

  init(activityId: String, taskIndex: Int) {
    self.activityId = activityId
    self.taskIndex = taskIndex
  }

  func perform() async throws -> some IntentResult {
    guard let activity = Activity<LiveActivityAttributes>.activities.first(where: { $0.id == activityId }) else {
      return .result()
    }
    var state = activity.content.state
    guard let subtitle = state.subtitle,
          let data = subtitle.data(using: .utf8),
          var tasks = try? JSONDecoder().decode([ADHDDOTaskItem].self, from: data),
          tasks.indices.contains(taskIndex) else {
      return .result()
    }
    tasks[taskIndex].done.toggle()
    if let encoded = try? JSONEncoder().encode(tasks),
       let json = String(data: encoded, encoding: .utf8) {
      state.subtitle = json
    }
    await activity.update(ActivityContent(state: state, staleDate: nil))
    return .result()
  }
}
