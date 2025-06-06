/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * A pub/sub implementation for coordinating tooltip visibility and preventing
 * multiple tooltips from opening at the same time.
 *
 * Provides a mechanism to allow a newly opened tooltip to inform other tooltips
 * that they should close.
 */

export type TooltipCallback = (activeTooltipId: string) => void;

class TooltipBus {
  private subscribers: TooltipCallback[] = [];

  subscribe(callback: TooltipCallback): void {
    this.subscribers.push(callback);
  }

  unsubscribe(callback: TooltipCallback): void {
    this.subscribers = this.subscribers.filter((cb) => cb !== callback);
  }

  emit(activeTooltipId: string): void {
    this.subscribers.forEach((callback) => callback(activeTooltipId));
  }
}

export const tooltipBus = new TooltipBus();
