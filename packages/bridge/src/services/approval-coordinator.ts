export class ApprovalCoordinator {
  private pendingApprovals = new Map<string, (approved: boolean) => void>();

  request(annotationId: string, emitApprovalRequest: () => void): Promise<boolean> {
    emitApprovalRequest();

    const existing = this.pendingApprovals.get(annotationId);
    if (existing) {
      existing(false);
    }

    return new Promise<boolean>((resolve) => {
      this.pendingApprovals.set(annotationId, resolve);
    });
  }

  resolve(annotationId: string, approved: boolean): boolean {
    const pending = this.pendingApprovals.get(annotationId);
    if (!pending) return false;

    this.pendingApprovals.delete(annotationId);
    pending(approved);
    return true;
  }

  clear(annotationId: string) {
    this.pendingApprovals.delete(annotationId);
  }

  clearAll(defaultApproval: boolean = false) {
    for (const resolve of this.pendingApprovals.values()) {
      resolve(defaultApproval);
    }
    this.pendingApprovals.clear();
  }
}
