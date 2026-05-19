import SwiftUI
import WidgetKit

#if canImport(ActivityKit)

  // ADHD-DO custom Live Activity view — coral card with tappable checkbox rows.
  // Tasks travel through contentState.subtitle as a JSON-encoded [ADHDDOTaskItem].
  struct LiveActivityView: View {
    let contentState: LiveActivityAttributes.ContentState
    let attributes: LiveActivityAttributes
    let activityID: String

    private var tasks: [ADHDDOTaskItem] {
      guard let subtitle = contentState.subtitle,
            let data = subtitle.data(using: .utf8),
            let decoded = try? JSONDecoder().decode([ADHDDOTaskItem].self, from: data)
      else { return [] }
      return decoded
    }

    private var primaryDeep: Color {
      Color(red: 0.78, green: 0.20, blue: 0.12)
    }

    var body: some View {
      let parsed = tasks

      VStack(alignment: .leading, spacing: 10) {
        // Header
        HStack(spacing: 8) {
          brandMark
          Text("ADHD-DO")
            .font(.system(size: 14, weight: .heavy))
            .kerning(-0.3)
            .foregroundStyle(.white)
          Text("now")
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(.white.opacity(0.75))
          Spacer()
        }

        if parsed.isEmpty {
          // Fallback — show title when no tasks payload (e.g. legacy / empty state)
          Text(contentState.title)
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(.white)
        } else {
          VStack(alignment: .leading, spacing: 9) {
            ForEach(Array(parsed.enumerated()), id: \.offset) { idx, task in
              taskRow(idx: idx, task: task)
            }
          }

          Rectangle()
            .fill(Color.white.opacity(0.14))
            .frame(height: 1)
            .padding(.top, 2)

          HStack {
            let done = parsed.filter { $0.done }.count
            Text("\(done)/\(parsed.count) done · tap to check off")
              .font(.system(size: 12, weight: .medium))
              .foregroundStyle(.white.opacity(0.78))
            Spacer()
            Text("Open ›")
              .font(.system(size: 12, weight: .medium))
              .foregroundStyle(.white.opacity(0.85))
          }
        }
      }
      .padding(EdgeInsets(top: 12, leading: 14, bottom: 14, trailing: 14))
    }

    private var brandMark: some View {
      ZStack {
        RoundedRectangle(cornerRadius: 6)
          .fill(Color.white.opacity(0.0))
          .frame(width: 20, height: 20)
        RoundedRectangle(cornerRadius: 5)
          .stroke(Color.white.opacity(0.95), lineWidth: 1.6)
          .frame(width: 20, height: 20)
        RoundedRectangle(cornerRadius: 2.5)
          .fill(Color.white)
          .frame(width: 8, height: 8)
          .offset(x: 2.5, y: 2.5)
      }
    }

    @ViewBuilder
    private func taskRow(idx: Int, task: ADHDDOTaskItem) -> some View {
      if #available(iOS 17.0, *) {
        Button(intent: ToggleTaskIntent(activityId: activityID, taskIndex: idx)) {
          rowContent(task: task)
        }
        .buttonStyle(.plain)
      } else {
        rowContent(task: task)
      }
    }

    private func rowContent(task: ADHDDOTaskItem) -> some View {
      HStack(spacing: 11) {
        ZStack {
          RoundedRectangle(cornerRadius: 7)
            .fill(task.done ? Color.white : Color.clear)
            .frame(width: 22, height: 22)
          RoundedRectangle(cornerRadius: 7)
            .stroke(Color.white.opacity(task.done ? 0 : 0.85), lineWidth: 1.8)
            .frame(width: 22, height: 22)
          if task.done {
            Image(systemName: "checkmark")
              .font(.system(size: 12, weight: .bold))
              .foregroundStyle(primaryDeep)
          }
        }
        Text(task.text)
          .font(.system(size: 16, weight: .semibold))
          .kerning(-0.2)
          .strikethrough(task.done, color: .white.opacity(0.55))
          .foregroundStyle(task.done ? Color.white.opacity(0.55) : .white)
          .lineLimit(1)
        Spacer(minLength: 0)
      }
      .contentShape(Rectangle())
    }
  }

#endif
