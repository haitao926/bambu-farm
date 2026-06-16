import { PublishCommandOptions } from '../types';

export class BambuCommandBuilder {
  private sequence = 1;

  build(options: PublishCommandOptions): {
    payload: Record<string, unknown>;
    sequenceId: string;
  } {
    const sequenceId = String(this.sequence++);

    return {
      sequenceId,
      payload: {
        [options.type]: {
          sequence_id: sequenceId,
          command: options.command,
          ...(options.payload ?? {}),
        },
      },
    };
  }
}
