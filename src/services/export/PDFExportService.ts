import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
  FoulSpecification,
  getActionColor,
} from "../../models/ActionTypes";
import { Team } from "../../models/types";
import type { CourtMarker } from "../../../components/BasketballCourtSVG";

interface Player {
  id: number;
  num: number;
  name: string;
  team: Team;
  photoUrl?: string;
}

interface PDFExportOptions {
  myTeamName: string;
  opponentName: string;
  myTeamScore: number;
  opponentScore: number;
  actions: any[]; // Accept raw actions from database with action_type field
  matchFormat: "2_halves" | "4_quarters";
  periodDuration: number;
  trackOpponentStats: boolean; // Whether opponent statistics are tracked
  players: Player[];
  matchDate?: Date;
  watermark?: boolean;
  scoreManuallyAdjusted?: boolean;
  clubLogoUrl?: string;
  courtBackgroundColor?: string;
  courtLineColor?: string;
}

export class PDFExportService {
  /**
   * Generate App logo SVG with readable formatting
   */
  private static generateAppLogoSVG(
    ballColor: string = "#FF8C42",
    ballBackgroundColor: string = "#000000",
    transparentBackground: boolean = false
  ): string {
    const bgFill = transparentBackground ? 'transparent' : '#ffffff';
    const svgString = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="500" height="500" viewBox="0 0 375 374.999991"
     preserveAspectRatio="xMidYMid meet" version="1.0">
  <defs>
    <clipPath id="aa14aa3478"><path d="M 11.292969 106.320312 L 350.5625 106.320312 L 350.5625 172.984375 L 11.292969 172.984375 Z M 11.292969 106.320312 " clip-rule="nonzero"/></clipPath>
    <clipPath id="81f306d547"><path d="M 0.292969 0.320312 L 339.5625 0.320312 L 339.5625 66.984375 L 0.292969 66.984375 Z M 0.292969 0.320312 " clip-rule="nonzero"/></clipPath>
    <clipPath id="67bd4031f7"><rect x="0" width="340" y="0" height="67"/></clipPath>
    <clipPath id="1663a2c298"><path d="M 76 55 L 115 55 L 115 99.140625 L 76 99.140625 Z M 76 55 " clip-rule="nonzero"/></clipPath>
    <clipPath id="e3c97b1f62"><path d="M 68.375 49 L 109 49 L 109 88 L 68.375 88 Z M 68.375 49 " clip-rule="nonzero"/></clipPath>
    <clipPath id="de3d5eeaf6"><path d="M 68.375 40 L 103 40 L 103 64 L 68.375 64 Z M 68.375 40 " clip-rule="nonzero"/></clipPath>
    <clipPath id="da684b1408"><path d="M 82 34.832031 L 108 34.832031 L 108 47 L 82 47 Z M 82 34.832031 " clip-rule="nonzero"/></clipPath>
    <clipPath id="07a01cce0b"><path d="M 99 62 L 125 62 L 125 99.140625 L 99 99.140625 Z M 99 62 " clip-rule="nonzero"/></clipPath>
    <clipPath id="7920a7ed85"><path d="M 117 58 L 132.679688 58 L 132.679688 88 L 117 88 Z M 117 58 " clip-rule="nonzero"/></clipPath>
    <clipPath id="2bc0171a2a"><path d="M 111 44 L 132.679688 44 L 132.679688 63 L 111 63 Z M 111 44 " clip-rule="nonzero"/></clipPath>
    <clipPath id="a612a9693e"><path d="M 76 55 L 115 55 L 115 99.140625 L 76 99.140625 Z M 76 55 " clip-rule="nonzero"/></clipPath>
    <clipPath id="7a26b6f0e6"><path d="M 136 0.921875 L 368 0.921875 L 368 133 L 136 133 Z M 136 0.921875 " clip-rule="nonzero"/></clipPath>
    <clipPath id="6caace87a5"><rect x="0" width="232" y="0" height="133"/></clipPath>
    <clipPath id="1455198bf7"><path d="M 0.921875 0.921875 L 69 0.921875 L 69 133 L 0.921875 133 Z M 0.921875 0.921875 " clip-rule="nonzero"/></clipPath>
    <clipPath id="62b2bbf020"><rect x="0" width="69" y="0" height="133"/></clipPath>
    <clipPath id="96f7e14ca3"><path d="M 16 105 L 347 105 L 347 182.839844 L 16 182.839844 Z M 16 105 " clip-rule="nonzero"/></clipPath>
    <clipPath id="09bb9cc649"><rect x="0" width="331" y="0" height="78"/></clipPath>
    <clipPath id="90a7471506"><rect x="0" width="368" y="0" height="183"/></clipPath>
  </defs>

  <!-- Background -->
  <rect x="-37.5" width="450" fill="${bgFill}" y="-37.499999" height="449.999989" fill-opacity="1"/>

  <g transform="matrix(1, 0, 0, 1, 7, 91)">
    <!-- Basketball ball background circle -->
    <circle cx="100.5" cy="67" r="35" fill="${ballBackgroundColor}"/>

    <g clip-path="url(#90a7471506)">
      <!-- Text "Coach" -->
      <g clip-path="url(#aa14aa3478)">
        <g transform="matrix(1, 0, 0, 1, 11, 106)">
          <g clip-path="url(#67bd4031f7)">
            <g clip-path="url(#81f306d547)">
              <path fill="#000000" d="M 0.292969 0.320312 L 339.597656 0.320312 L 339.597656 66.984375 L 0.292969 66.984375 Z M 0.292969 0.320312 " fill-opacity="1" fill-rule="nonzero"/>
            </g>
          </g>
        </g>
      </g>

      <!-- Basketball ball segments -->
      <g clip-path="url(#1663a2c298)"><path fill="${ballColor}" d="M 110.460938 55.265625 L 114.6875 60.484375 C 104.394531 68.054688 108.773438 94.378906 97.359375 99.140625 C 89.285156 98.347656 82.082031 94.542969 76.886719 88.863281 C 87.292969 76.316406 98.054688 64.367188 110.460938 55.265625 Z M 110.460938 55.265625 " fill-opacity="1" fill-rule="evenodd"/></g>
      <g clip-path="url(#e3c97b1f62)"><path fill="${ballColor}" d="M 104.394531 49.390625 L 108.945312 53.960938 C 93.871094 66.785156 84.332031 77.53125 76.132812 87.773438 L 75.996094 87.851562 C 71.269531 82.238281 68.421875 74.980469 68.421875 67.0625 C 68.421875 66.421875 68.441406 65.785156 68.476562 65.15625 C 74.183594 53.59375 95.628906 57.382812 104.394531 49.394531 Z M 104.394531 49.390625 " fill-opacity="1" fill-rule="evenodd"/></g>
      <g clip-path="url(#de3d5eeaf6)"><path fill="${ballColor}" d="M 85.402344 40.53125 C 92.570312 40.601562 101.671875 45.230469 102.554688 47.875 C 102.265625 54.515625 71.855469 52.566406 68.65625 63.527344 L 68.613281 63.535156 C 69.617188 54.285156 74.523438 46.207031 81.640625 41 C 82.804688 40.660156 84.078125 40.515625 85.402344 40.53125 Z M 85.402344 40.53125 " fill-opacity="1" fill-rule="evenodd"/></g>
      <g clip-path="url(#da684b1408)"><path fill="${ballColor}" d="M 100.53125 34.828125 C 102.140625 34.828125 103.730469 34.949219 105.277344 35.179688 C 110.054688 40.367188 107.503906 45.03125 104.941406 46.457031 C 102.75 48.023438 97.105469 38.222656 82.945312 40.09375 C 88 36.765625 94.039062 34.828125 100.53125 34.828125 Z M 100.53125 34.828125 " fill-opacity="1" fill-rule="evenodd"/></g>
      <g clip-path="url(#07a01cce0b)"><path fill="${ballColor}" d="M 115.167969 62.195312 C 115.460938 62.199219 115.769531 62.257812 116.089844 62.371094 C 120.277344 65.667969 127.929688 81.53125 123.457031 89.4375 C 123.457031 89.4375 123.457031 89.441406 123.457031 89.441406 C 117.628906 95.410156 109.507812 99.113281 100.53125 99.113281 C 100.28125 99.113281 100.039062 99.113281 99.792969 99.105469 C 109.464844 92.089844 107.359375 64.121094 115.167969 62.195312 Z M 115.167969 62.195312 " fill-opacity="1" fill-rule="evenodd"/></g>
      <g clip-path="url(#7920a7ed85)"><path fill="${ballColor}" d="M 122.894531 58.304688 C 126.410156 58.417969 130.511719 60.265625 132.445312 64.289062 L 132.546875 64.53125 C 132.609375 65.367188 132.644531 66.210938 132.644531 67.0625 C 132.644531 75.035156 129.753906 82.335938 124.96875 87.964844 C 129.398438 74.011719 115.925781 61.742188 117.390625 60.378906 C 118.359375 58.96875 120.488281 58.230469 122.894531 58.304688 Z M 122.894531 58.304688 " fill-opacity="1" fill-rule="evenodd"/></g>
      <g clip-path="url(#2bc0171a2a)"><path fill="${ballColor}" d="M 123.914062 44.976562 C 128.449219 49.816406 131.523438 56.058594 132.394531 62.984375 C 128.980469 57.253906 123.890625 55.175781 115.660156 59.507812 L 111.4375 54.179688 C 114.191406 51.683594 120.007812 47.371094 123.914062 44.976562 Z M 123.914062 44.976562 " fill-opacity="1" fill-rule="evenodd"/></g>
      <path fill="${ballColor}" d="M 106.664062 35.414062 C 112.957031 36.636719 118.59375 39.707031 122.996094 44.035156 L 122.917969 44.175781 C 118.285156 46.292969 114.324219 49.765625 110.242188 52.984375 L 105.371094 48.414062 C 108.546875 45.203125 110.992188 41.695312 106.664062 35.414062 Z M 106.664062 35.414062 " fill-opacity="1" fill-rule="evenodd"/>
      <g clip-path="url(#a612a9693e)"><path fill="${ballColor}" d="M 110.460938 55.265625 L 114.6875 60.484375 C 104.394531 68.054688 108.773438 94.378906 97.359375 99.140625 C 89.285156 98.347656 82.082031 94.542969 76.886719 88.863281 C 87.292969 76.316406 98.054688 64.367188 110.460938 55.265625 Z M 110.460938 55.265625 " fill-opacity="1" fill-rule="evenodd"/></g>

      <!-- Text content paths continue... -->
      <g clip-path="url(#7a26b6f0e6)"><g transform="matrix(1, 0, 0, 1, 136, 0)"><g clip-path="url(#6caace87a5)"><g fill="#000000" fill-opacity="1"><g transform="translate(0.380879, 98.97403)"><g><path d="M 55.015625 -32.671875 C 54.753906 -38.421875 53.269531 -42.972656 50.5625 -46.328125 C 47.863281 -49.679688 43.554688 -51.359375 37.640625 -51.359375 C 31.273438 -51.359375 26.695312 -49.523438 23.90625 -45.859375 C 21.125 -42.203125 19.734375 -37.804688 19.734375 -32.671875 C 19.734375 -29.273438 20.320312 -26.160156 21.5 -23.328125 C 22.675781 -20.492188 24.59375 -18.226562 27.25 -16.53125 C 29.90625 -14.832031 33.367188 -13.984375 37.640625 -13.984375 C 43.035156 -13.984375 47.28125 -15.503906 50.375 -18.546875 C 53.46875 -21.597656 55.015625 -26.304688 55.015625 -32.671875 Z M 75.921875 0 L 60.234375 0 C 59.535156 -1.738281 58.925781 -3.4375 58.40625 -5.09375 C 57.882812 -6.75 57.40625 -8.40625 56.96875 -10.0625 C 54.789062 -6.84375 51.9375 -4.25 48.40625 -2.28125 C 44.882812 -0.320312 40.679688 0.65625 35.796875 0.65625 C 29.617188 0.65625 24.132812 -0.820312 19.34375 -3.78125 C 14.550781 -6.75 10.800781 -10.78125 8.09375 -15.875 C 5.394531 -20.96875 4.046875 -26.609375 4.046875 -32.796875 C 4.046875 -38.898438 5.375 -44.453125 8.03125 -49.453125 C 10.6875 -54.460938 14.519531 -58.46875 19.53125 -61.46875 C 24.539062 -64.476562 30.578125 -65.984375 37.640625 -65.984375 C 47.566406 -65.984375 55.46875 -62.976562 61.34375 -56.96875 C 67.226562 -50.957031 70.34375 -42.859375 70.6875 -32.671875 C 70.78125 -30.492188 70.867188 -27.660156 70.953125 -24.171875 C 71.035156 -20.691406 71.40625 -16.859375 72.0625 -12.671875 C 72.71875 -8.492188 74.003906 -4.269531 75.921875 0 Z M 75.921875 0 "/></g></g></g><g fill="#000000" fill-opacity="1"><g transform="translate(78.906652, 98.97403)"><g><path d="M 57.890625 -18.03125 L 57.890625 -1.953125 C 55.097656 -1.085938 51.9375 -0.394531 48.40625 0.125 C 44.882812 0.65625 41.335938 0.921875 37.765625 0.921875 C 30.617188 0.921875 24.519531 -0.582031 19.46875 -3.59375 C 14.414062 -6.601562 10.582031 -10.632812 7.96875 -15.6875 C 5.351562 -20.738281 4.046875 -26.351562 4.046875 -32.53125 C 4.046875 -38.71875 5.351562 -44.335938 7.96875 -49.390625 C 10.582031 -54.441406 14.414062 -58.46875 19.46875 -61.46875 C 24.519531 -64.476562 30.617188 -65.984375 37.765625 -65.984375 C 41.335938 -65.984375 44.882812 -65.742188 48.40625 -65.265625 C 51.9375 -64.785156 55.097656 -64.066406 57.890625 -63.109375 L 57.890625 -47.046875 C 55.710938 -48.265625 52.835938 -49.195312 49.265625 -49.84375 C 45.691406 -50.5 42.117188 -50.828125 38.546875 -50.828125 C 33.835938 -50.828125 30.113281 -50.019531 27.375 -48.40625 C 24.632812 -46.800781 22.675781 -44.625 21.5 -41.875 C 20.320312 -39.132812 19.734375 -36.066406 19.734375 -32.671875 C 19.734375 -29.273438 20.320312 -26.179688 21.5 -23.390625 C 22.675781 -20.597656 24.632812 -18.375 27.375 -16.71875 C 30.113281 -15.070312 33.835938 -14.25 38.546875 -14.25 C 42.117188 -14.25 45.691406 -14.59375 49.265625 -15.28125 C 52.835938 -15.976562 55.710938 -16.894531 57.890625 -18.03125 Z M 57.890625 -18.03125 "/></g></g></g><g fill="#000000" fill-opacity="1"><g transform="translate(142.145347, 98.97403)"><g><path d="M 23.515625 -32.671875 L 23.515625 0 L 7.84375 0 L 7.84375 -91.46875 L 23.515625 -91.46875 L 23.515625 -57.890625 C 25.691406 -60.410156 28.347656 -62.390625 31.484375 -63.828125 C 34.628906 -65.265625 38.203125 -65.984375 42.203125 -65.984375 C 48.210938 -65.984375 53.4375 -64.503906 57.875 -61.546875 C 62.320312 -58.585938 65.765625 -54.582031 68.203125 -49.53125 C 70.648438 -44.476562 71.875 -38.859375 71.875 -32.671875 L 71.875 0 L 56.1875 0 L 56.1875 -32.671875 C 56.1875 -38.242188 54.96875 -42.75 52.53125 -46.1875 C 50.09375 -49.632812 46.085938 -51.359375 40.515625 -51.359375 C 34.929688 -51.359375 30.703125 -49.613281 27.828125 -46.125 C 24.953125 -42.644531 23.515625 -38.160156 23.515625 -32.671875 Z M 23.515625 -32.671875 "/></g></g></g><g fill="#000000" fill-opacity="1"><g transform="translate(220.82559, 98.97403)"><g/></g></g></g></g></g><g clip-path="url(#1455198bf7)"><g transform="matrix(1, 0, 0, 1, -0.000000000000000888, 0)"><g clip-path="url(#62b2bbf020)"><g fill="#000000" fill-opacity="1"><g transform="translate(3.890596, 98.97403)"><g><path d="M 57.890625 -18.03125 L 57.890625 -1.953125 C 55.097656 -1.085938 51.9375 -0.394531 48.40625 0.125 C 44.882812 0.65625 41.335938 0.921875 37.765625 0.921875 C 30.617188 0.921875 24.519531 -0.582031 19.46875 -3.59375 C 14.414062 -6.601562 10.582031 -10.632812 7.96875 -15.6875 C 5.351562 -20.738281 4.046875 -26.351562 4.046875 -32.53125 C 4.046875 -38.71875 5.351562 -44.335938 7.96875 -49.390625 C 10.582031 -54.441406 14.414062 -58.46875 19.46875 -61.46875 C 24.519531 -64.476562 30.617188 -65.984375 37.765625 -65.984375 C 41.335938 -65.984375 44.882812 -65.742188 48.40625 -65.265625 C 51.9375 -64.785156 55.097656 -64.066406 57.890625 -63.109375 L 57.890625 -47.046875 C 55.710938 -48.265625 52.835938 -49.195312 49.265625 -49.84375 C 45.691406 -50.5 42.117188 -50.828125 38.546875 -50.828125 C 33.835938 -50.828125 30.113281 -50.019531 27.375 -48.40625 C 24.632812 -46.800781 22.675781 -44.625 21.5 -41.875 C 20.320312 -39.132812 19.734375 -36.066406 19.734375 -32.671875 C 19.734375 -29.273438 20.320312 -26.179688 21.5 -23.390625 C 22.675781 -20.597656 24.632812 -18.375 27.375 -16.71875 C 30.113281 -15.070312 33.835938 -14.25 38.546875 -14.25 C 42.117188 -14.25 45.691406 -14.59375 49.265625 -15.28125 C 52.835938 -15.976562 55.710938 -16.894531 57.890625 -18.03125 Z M 57.890625 -18.03125 "/></g></g></g></g></g></g><g clip-path="url(#96f7e14ca3)"><g transform="matrix(1, 0, 0, 1, 16, 105)"><g clip-path="url(#09bb9cc649)"><g fill="#ffffff" fill-opacity="1"><g transform="translate(1.065655, 58.007297)"><g><path d="M 32.34375 -19.203125 C 32.1875 -22.578125 31.3125 -25.25 29.71875 -27.21875 C 28.132812 -29.195312 25.601562 -30.1875 22.125 -30.1875 C 18.382812 -30.1875 15.691406 -29.109375 14.046875 -26.953125 C 12.410156 -24.804688 11.59375 -22.222656 11.59375 -19.203125 C 11.59375 -17.203125 11.9375 -15.367188 12.625 -13.703125 C 13.320312 -12.046875 14.453125 -10.71875 16.015625 -9.71875 C 17.578125 -8.71875 19.613281 -8.21875 22.125 -8.21875 C 25.300781 -8.21875 27.796875 -9.113281 29.609375 -10.90625 C 31.429688 -12.695312 32.34375 -15.460938 32.34375 -19.203125 Z M 44.625 0 L 35.40625 0 C 35 -1.019531 34.640625 -2.015625 34.328125 -2.984375 C 34.023438 -3.960938 33.742188 -4.941406 33.484375 -5.921875 C 32.203125 -4.023438 30.523438 -2.5 28.453125 -1.34375 C 26.378906 -0.1875 23.910156 0.390625 21.046875 0.390625 C 17.410156 0.390625 14.179688 -0.476562 11.359375 -2.21875 C 8.546875 -3.96875 6.34375 -6.335938 4.75 -9.328125 C 3.164062 -12.328125 2.375 -15.644531 2.375 -19.28125 C 2.375 -22.863281 3.15625 -26.125 4.71875 -29.0625 C 6.28125 -32.007812 8.535156 -34.367188 11.484375 -36.140625 C 14.429688 -37.910156 17.976562 -38.796875 22.125 -38.796875 C 27.957031 -38.796875 32.601562 -37.023438 36.0625 -33.484375 C 39.519531 -29.953125 41.351562 -25.191406 41.5625 -19.203125 C 41.601562 -17.921875 41.648438 -16.253906 41.703125 -14.203125 C 41.753906 -12.160156 41.972656 -9.910156 42.359375 -7.453125 C 42.742188 -4.992188 43.5 -2.507812 44.625 0 Z M 44.625 0 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(47.221306, 58.007297)"><g><path d="M 2.84375 -1.234375 L 2.84375 -9.90625 C 4.019531 -9.601562 5.503906 -9.332031 7.296875 -9.09375 C 9.085938 -8.863281 10.941406 -8.6875 12.859375 -8.5625 C 14.785156 -8.4375 16.515625 -8.375 18.046875 -8.375 C 21.066406 -8.375 23.242188 -8.613281 24.578125 -9.09375 C 25.910156 -9.582031 26.578125 -10.363281 26.578125 -11.4375 C 26.578125 -11.957031 26.34375 -12.394531 25.875 -12.75 C 25.414062 -13.101562 24.492188 -13.457031 23.109375 -13.8125 C 21.734375 -14.175781 19.640625 -14.613281 16.828125 -15.125 C 15.847656 -15.332031 14.601562 -15.601562 13.09375 -15.9375 C 11.582031 -16.269531 10.054688 -16.820312 8.515625 -17.59375 C 6.984375 -18.363281 5.707031 -19.476562 4.6875 -20.9375 C 3.664062 -22.394531 3.15625 -24.328125 3.15625 -26.734375 C 3.15625 -29.492188 3.859375 -31.753906 5.265625 -33.515625 C 6.671875 -35.285156 8.613281 -36.609375 11.09375 -37.484375 C 13.582031 -38.359375 16.390625 -38.796875 19.515625 -38.796875 C 20.796875 -38.796875 22.253906 -38.726562 23.890625 -38.59375 C 25.523438 -38.46875 27.1875 -38.273438 28.875 -38.015625 C 30.570312 -37.765625 32.082031 -37.457031 33.40625 -37.09375 L 33.40625 -28.421875 C 32.4375 -28.722656 31.109375 -28.988281 29.421875 -29.21875 C 27.734375 -29.457031 25.976562 -29.640625 24.15625 -29.765625 C 22.34375 -29.890625 20.691406 -29.953125 19.203125 -29.953125 C 16.535156 -29.953125 14.664062 -29.695312 13.59375 -29.1875 C 12.519531 -28.675781 11.984375 -27.957031 11.984375 -27.03125 C 11.984375 -26.0625 12.609375 -25.347656 13.859375 -24.890625 C 15.117188 -24.429688 17.382812 -23.867188 20.65625 -23.203125 C 23.164062 -22.734375 25.546875 -22.15625 27.796875 -21.46875 C 30.054688 -20.78125 31.890625 -19.71875 33.296875 -18.28125 C 34.703125 -16.84375 35.40625 -14.71875 35.40625 -11.90625 C 35.40625 -9.039062 34.609375 -6.6875 33.015625 -4.84375 C 31.429688 -3 29.296875 -1.65625 26.609375 -0.8125 C 23.921875 0.03125 20.914062 0.453125 17.59375 0.453125 C 16.257812 0.453125 14.707031 0.390625 12.9375 0.265625 C 11.175781 0.140625 9.410156 -0.046875 7.640625 -0.296875 C 5.878906 -0.554688 4.28125 -0.867188 2.84375 -1.234375 Z M 2.84375 -1.234375 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(84.775564, 58.007297)"><g><path d="M 2.84375 -1.234375 L 2.84375 -9.90625 C 4.019531 -9.601562 5.503906 -9.332031 7.296875 -9.09375 C 9.085938 -8.863281 10.941406 -8.6875 12.859375 -8.5625 C 14.785156 -8.4375 16.515625 -8.375 18.046875 -8.375 C 21.066406 -8.375 23.242188 -8.613281 24.578125 -9.09375 C 25.910156 -9.582031 26.578125 -10.363281 26.578125 -11.4375 C 26.578125 -11.957031 26.34375 -12.394531 25.875 -12.75 C 25.414062 -13.101562 24.492188 -13.457031 23.109375 -13.8125 C 21.734375 -14.175781 19.640625 -14.613281 16.828125 -15.125 C 15.847656 -15.332031 14.601562 -15.601562 13.09375 -15.9375 C 11.582031 -16.269531 10.054688 -16.820312 8.515625 -17.59375 C 6.984375 -18.363281 5.707031 -19.476562 4.6875 -20.9375 C 3.664062 -22.394531 3.15625 -24.328125 3.15625 -26.734375 C 3.15625 -29.492188 3.859375 -31.753906 5.265625 -33.515625 C 6.671875 -35.285156 8.613281 -36.609375 11.09375 -37.484375 C 13.582031 -38.359375 16.390625 -38.796875 19.515625 -38.796875 C 20.796875 -38.796875 22.253906 -38.726562 23.890625 -38.59375 C 25.523438 -38.46875 27.1875 -38.273438 28.875 -38.015625 C 30.570312 -37.765625 32.082031 -37.457031 33.40625 -37.09375 L 33.40625 -28.421875 C 32.4375 -28.722656 31.109375 -28.988281 29.421875 -29.21875 C 27.734375 -29.457031 25.976562 -29.640625 24.15625 -29.765625 C 22.34375 -29.890625 20.691406 -29.953125 19.203125 -29.953125 C 16.535156 -29.953125 14.664062 -29.695312 13.59375 -29.1875 C 12.519531 -28.675781 11.984375 -27.957031 11.984375 -27.03125 C 11.984375 -26.0625 12.609375 -25.347656 13.859375 -24.890625 C 15.117188 -24.429688 17.382812 -23.867188 20.65625 -23.203125 C 23.164062 -22.734375 25.546875 -22.15625 27.796875 -21.46875 C 30.054688 -20.78125 31.890625 -19.71875 33.296875 -18.28125 C 34.703125 -16.84375 35.40625 -14.71875 35.40625 -11.90625 C 35.40625 -9.039062 34.609375 -6.6875 33.015625 -4.84375 C 31.429688 -3 29.296875 -1.65625 26.609375 -0.8125 C 23.921875 0.03125 20.914062 0.453125 17.59375 0.453125 C 16.257812 0.453125 14.707031 0.390625 12.9375 0.265625 C 11.175781 0.140625 9.410156 -0.046875 7.640625 -0.296875 C 5.878906 -0.554688 4.28125 -0.867188 2.84375 -1.234375 Z M 2.84375 -1.234375 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(122.56023, 58.007297)"><g><path d="M 13.828125 -38.40625 L 13.828125 0 L 4.609375 0 L 4.609375 -38.40625 Z M 9.21875 -42.78125 C 7.375 -42.78125 5.925781 -43.367188 4.875 -44.546875 C 3.820312 -45.722656 3.296875 -47.109375 3.296875 -48.703125 C 3.296875 -50.335938 3.820312 -51.71875 4.875 -52.84375 C 5.925781 -53.96875 7.375 -54.53125 9.21875 -54.53125 C 11.0625 -54.53125 12.492188 -53.953125 13.515625 -52.796875 C 14.546875 -51.648438 15.0625 -50.285156 15.0625 -48.703125 C 15.0625 -47.054688 14.546875 -45.65625 13.515625 -44.5 C 12.492188 -43.351562 11.0625 -42.78125 9.21875 -42.78125 Z M 9.21875 -42.78125 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(140.991777, 58.007297)"><g><path d="M 2.84375 -1.234375 L 2.84375 -9.90625 C 4.019531 -9.601562 5.503906 -9.332031 7.296875 -9.09375 C 9.085938 -8.863281 10.941406 -8.6875 12.859375 -8.5625 C 14.785156 -8.4375 16.515625 -8.375 18.046875 -8.375 C 21.066406 -8.375 23.242188 -8.613281 24.578125 -9.09375 C 25.910156 -9.582031 26.578125 -10.363281 26.578125 -11.4375 C 26.578125 -11.957031 26.34375 -12.394531 25.875 -12.75 C 25.414062 -13.101562 24.492188 -13.457031 23.109375 -13.8125 C 21.734375 -14.175781 19.640625 -14.613281 16.828125 -15.125 C 15.847656 -15.332031 14.601562 -15.601562 13.09375 -15.9375 C 11.582031 -16.269531 10.054688 -16.820312 8.515625 -17.59375 C 6.984375 -18.363281 5.707031 -19.476562 4.6875 -20.9375 C 3.664062 -22.394531 3.15625 -24.328125 3.15625 -26.734375 C 3.15625 -29.492188 3.859375 -31.753906 5.265625 -33.515625 C 6.671875 -35.285156 8.613281 -36.609375 11.09375 -37.484375 C 13.582031 -38.359375 16.390625 -38.796875 19.515625 -38.796875 C 20.796875 -38.796875 22.253906 -38.726562 23.890625 -38.59375 C 25.523438 -38.46875 27.1875 -38.273438 28.875 -38.015625 C 30.570312 -37.765625 32.082031 -37.457031 33.40625 -37.09375 L 33.40625 -28.421875 C 32.4375 -28.722656 31.109375 -28.988281 29.421875 -29.21875 C 27.734375 -29.457031 25.976562 -29.640625 24.15625 -29.765625 C 22.34375 -29.890625 20.691406 -29.953125 19.203125 -29.953125 C 16.535156 -29.953125 14.664062 -29.695312 13.59375 -29.1875 C 12.519531 -28.675781 11.984375 -27.957031 11.984375 -27.03125 C 11.984375 -26.0625 12.609375 -25.347656 13.859375 -24.890625 C 15.117188 -24.429688 17.382812 -23.867188 20.65625 -23.203125 C 23.164062 -22.734375 25.546875 -22.15625 27.796875 -21.46875 C 30.054688 -20.78125 31.890625 -19.71875 33.296875 -18.28125 C 34.703125 -16.84375 35.40625 -14.71875 35.40625 -11.90625 C 35.40625 -9.039062 34.609375 -6.6875 33.015625 -4.84375 C 31.429688 -3 29.296875 -1.65625 26.609375 -0.8125 C 23.921875 0.03125 20.914062 0.453125 17.59375 0.453125 C 16.257812 0.453125 14.707031 0.390625 12.9375 0.265625 C 11.175781 0.140625 9.410156 -0.046875 7.640625 -0.296875 C 5.878906 -0.554688 4.28125 -0.867188 2.84375 -1.234375 Z M 2.84375 -1.234375 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(178.392412, 58.007297)"><g><path d="M 25.125 -37.09375 L 25.125 -28.5 L 13.21875 -28.5 L 13.21875 -19.203125 C 13.21875 -15.972656 14.0625 -13.332031 15.75 -11.28125 C 17.4375 -9.238281 20.019531 -8.21875 23.5 -8.21875 C 24.269531 -8.21875 24.910156 -8.269531 25.421875 -8.375 C 25.929688 -8.476562 26.445312 -8.554688 26.96875 -8.609375 L 26.96875 0 C 26.300781 0.0507812 25.75 0.128906 25.3125 0.234375 C 24.875 0.335938 24.171875 0.390625 23.203125 0.390625 C 19.253906 0.390625 15.847656 -0.476562 12.984375 -2.21875 C 10.117188 -3.96875 7.90625 -6.328125 6.34375 -9.296875 C 4.78125 -12.265625 4 -15.566406 4 -19.203125 L 4 -47.625 L 13.21875 -47.625 L 13.21875 -37.09375 Z M 25.125 -37.09375 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(206.577165, 58.007297)"><g><path d="M 32.34375 -19.203125 C 32.1875 -22.578125 31.3125 -25.25 29.71875 -27.21875 C 28.132812 -29.195312 25.601562 -30.1875 22.125 -30.1875 C 18.382812 -30.1875 15.691406 -29.109375 14.046875 -26.953125 C 12.410156 -24.804688 11.59375 -22.222656 11.59375 -19.203125 C 11.59375 -17.203125 11.9375 -15.367188 12.625 -13.703125 C 13.320312 -12.046875 14.453125 -10.71875 16.015625 -9.71875 C 17.578125 -8.71875 19.613281 -8.21875 22.125 -8.21875 C 25.300781 -8.21875 27.796875 -9.113281 29.609375 -10.90625 C 31.429688 -12.695312 32.34375 -15.460938 32.34375 -19.203125 Z M 44.625 0 L 35.40625 0 C 35 -1.019531 34.640625 -2.015625 34.328125 -2.984375 C 34.023438 -3.960938 33.742188 -4.941406 33.484375 -5.921875 C 32.203125 -4.023438 30.523438 -2.5 28.453125 -1.34375 C 26.378906 -0.1875 23.910156 0.390625 21.046875 0.390625 C 17.410156 0.390625 14.179688 -0.476562 11.359375 -2.21875 C 8.546875 -3.96875 6.34375 -6.335938 4.75 -9.328125 C 3.164062 -12.328125 2.375 -15.644531 2.375 -19.28125 C 2.375 -22.863281 3.15625 -26.125 4.71875 -29.0625 C 6.28125 -32.007812 8.535156 -34.367188 11.484375 -36.140625 C 14.429688 -37.910156 17.976562 -38.796875 22.125 -38.796875 C 27.957031 -38.796875 32.601562 -37.023438 36.0625 -33.484375 C 39.519531 -29.953125 41.351562 -25.191406 41.5625 -19.203125 C 41.601562 -17.921875 41.648438 -16.253906 41.703125 -14.203125 C 41.753906 -12.160156 41.972656 -9.910156 42.359375 -7.453125 C 42.742188 -4.992188 43.5 -2.507812 44.625 0 Z M 44.625 0 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(252.732816, 58.007297)"><g><path d="M 42.25 -19.203125 L 42.25 0 L 33.03125 0 L 33.03125 -19.203125 C 33.03125 -22.429688 32.25 -25.066406 30.6875 -27.109375 C 29.125 -29.160156 26.703125 -30.1875 23.421875 -30.1875 C 20.148438 -30.1875 17.734375 -29.160156 16.171875 -27.109375 C 14.609375 -25.066406 13.828125 -22.429688 13.828125 -19.203125 L 13.828125 0 L 4.609375 0 L 4.609375 -19.203125 C 4.609375 -22.835938 5.347656 -26.140625 6.828125 -29.109375 C 8.316406 -32.078125 10.46875 -34.429688 13.28125 -36.171875 C 16.101562 -37.921875 19.484375 -38.796875 23.421875 -38.796875 C 27.421875 -38.796875 30.816406 -37.921875 33.609375 -36.171875 C 36.398438 -34.429688 38.535156 -32.078125 40.015625 -29.109375 C 41.503906 -26.140625 42.25 -22.835938 42.25 -19.203125 Z M 42.25 -19.203125 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(298.965251, 58.007297)"><g><path d="M 25.125 -37.09375 L 25.125 -28.5 L 13.21875 -28.5 L 13.21875 -19.203125 C 13.21875 -15.972656 14.0625 -13.332031 15.75 -11.28125 C 17.4375 -9.238281 20.019531 -8.21875 23.5 -8.21875 C 24.269531 -8.21875 24.910156 -8.269531 25.421875 -8.375 C 25.929688 -8.476562 26.445312 -8.554688 26.96875 -8.609375 L 26.96875 0 C 26.300781 0.0507812 25.75 0.128906 25.3125 0.234375 C 24.875 0.335938 24.171875 0.390625 23.203125 0.390625 C 19.253906 0.390625 15.847656 -0.476562 12.984375 -2.21875 C 10.117188 -3.96875 7.90625 -6.328125 6.34375 -9.296875 C 4.78125 -12.265625 4 -15.566406 4 -19.203125 L 4 -47.625 L 13.21875 -47.625 L 13.21875 -37.09375 Z M 25.125 -37.09375 "/></g></g></g></g></g></g></g></g></svg>  `;
    return `data:image/svg+xml;base64,${btoa(svgString)}`;
  }

  /**
   * Convert an image URL to a base64 data URI
   */
  private static async imageUrlToBase64(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[PDF Export] Failed to fetch image: ${url}`);
        return null;
      }
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn(
        `[PDF Export] Error converting image to base64: ${url}`,
        error
      );
      return null;
    }
  }

  /**
   * Generate a basketball match statistics PDF
   */
  static async generateMatchPDF(options: PDFExportOptions): Promise<string> {
    const {
      myTeamName,
      opponentName,
      myTeamScore,
      opponentScore,
      actions,
      matchFormat,
      trackOpponentStats,
      players,
      matchDate = new Date(),
      watermark = false,
      scoreManuallyAdjusted = false,
      clubLogoUrl,
      courtBackgroundColor = "#1a472a",
      courtLineColor = "#FFFFFF",
    } = options;

    // Convert player photos to base64 for PDF embedding
    const playersWithBase64Photos = await Promise.all(
      players.map(async (player) => {
        if (player.photoUrl && player.photoUrl.startsWith("http")) {
          const base64Photo = await this.imageUrlToBase64(player.photoUrl);
          return {
            ...player,
            photoUrl: base64Photo || player.photoUrl,
          };
        }
        return player;
      })
    );

    // Convert club logo to base64 for PDF embedding
    console.log(`[PDF Export] Club logo URL:`, clubLogoUrl);
    let clubLogoBase64 = clubLogoUrl;
    if (clubLogoUrl && clubLogoUrl.startsWith("http")) {
      console.log(`[PDF Export] Converting club logo to base64`);
      const base64Logo = await this.imageUrlToBase64(clubLogoUrl);
      clubLogoBase64 = base64Logo || clubLogoUrl;
      console.log(
        `[PDF Export] Club logo conversion complete, has base64:`,
        !!base64Logo
      );
    } else {
      console.log(
        `[PDF Export] Club logo not converted (not http or undefined)`
      );
    }

    const totalPeriods = matchFormat === "2_halves" ? 2 : 4;
    const periodLabel = matchFormat === "2_halves" ? "MT" : "Q";

    // Calculate period scores
    const { periodScoresMyTeam, periodScoresOpponent } = this.calculatePeriodScores(
      actions,
      totalPeriods
    );

    // Calculate cumulative scores for chart
    const cumulativeScoresMyTeam: number[] = [];
    const cumulativeScoresOpponent: number[] = [];
    let sumMyTeam = 0;
    let sumOpponent = 0;

    for (let i = 0; i < totalPeriods; i++) {
      sumMyTeam += periodScoresMyTeam[i];
      sumOpponent += periodScoresOpponent[i];
      cumulativeScoresMyTeam.push(sumMyTeam);
      cumulativeScoresOpponent.push(sumOpponent);
    }

    // Calculate player stats - always include MY_TEAM, include OPPONENT only if tracking
    const playersMyTeam = playersWithBase64Photos.filter((p) => p.team === Team.MY_TEAM);
    const playersOpponent = trackOpponentStats
      ? playersWithBase64Photos.filter((p) => p.team === Team.OPPONENT)
      : [];

    const statsMyTeam = playersMyTeam.map((player) => ({
      ...player,
      stats: this.calculatePlayerStats(player.id, actions),
    }));

    const statsOpponent = playersOpponent.map((player) => ({
      ...player,
      stats: this.calculatePlayerStats(player.id, actions),
    }));

    // Generate HTML
    const html = this.generateHTML({
      myTeamName,
      opponentName,
      myTeamScore,
      opponentScore,
      matchDate,
      periodLabel,
      totalPeriods,
      periodScoresMyTeam,
      periodScoresOpponent,
      cumulativeScoresMyTeam,
      cumulativeScoresOpponent,
      statsMyTeam,
      statsOpponent,
      trackOpponentStats,
      watermark,
      scoreManuallyAdjusted,
      clubLogoUrl: clubLogoBase64,
      courtBackgroundColor,
      courtLineColor,
      actions,
      players: playersWithBase64Photos,
      matchFormat,
      periodDuration: options.periodDuration,
    });

    // Generate PDF using expo-print
    const { uri } = await Print.printToFileAsync({ html });

    // Share the PDF
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }

    return uri;
  }

  /**
   * Calculate scores by period
   */
  private static calculatePeriodScores(
    actions: any[],
    totalPeriods: number
  ) {
    const periodScoresMyTeam: number[] = Array(totalPeriods).fill(0);
    const periodScoresOpponent: number[] = Array(totalPeriods).fill(0);

    const sortedActions = [...actions].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const actionsPerPeriod = Math.ceil(sortedActions.length / totalPeriods);

    sortedActions.forEach((action, index) => {
      const periodIndex = Math.min(
        Math.floor(index / actionsPerPeriod),
        totalPeriods - 1
      );

      if (
        action.type === ActionType.SHOT &&
        action.specification === ShotSpecification.MADE
      ) {
        const points = action.points || 0;
        const team = action.team;
        // Support both old ("A"/"B") and new (Team.MY_TEAM/Team.OPPONENT) formats
        if (team === Team.MY_TEAM || team === "A") {
          periodScoresMyTeam[periodIndex] += points;
        } else if (team === Team.OPPONENT || team === "B") {
          periodScoresOpponent[periodIndex] += points;
        }
      }
    });

    return { periodScoresMyTeam, periodScoresOpponent };
  }


  /**
   * Helper: Calculate total fouls for a player
   */
  private static calculateTotalFouls(stats: {
    pf: number;
    tf: number;
    uf: number;
    df: number;
  }): number {
    return stats.pf + stats.tf + stats.uf + stats.df;
  }

  /**
   * Helper: Calculate shooting percentage
   */
  private static calculateShootingPercentage(made: number, attempts: number): number {
    return attempts > 0 ? Math.round((made / attempts) * 100) : 0;
  }

  /**
   * Calculate individual player stats
   */
  private static calculatePlayerStats(playerId: number, actions: any[]) {
    const playerActions = actions.filter((a) => a.player === playerId);

    // Shots
    const shots = playerActions.filter((a) => a.type === ActionType.SHOT);
    const madeShots = shots.filter(
      (a) => a.specification === ShotSpecification.MADE
    );

    const onePtMade = madeShots.filter((a) => a.points === 1).length;
    const twoPtMade = madeShots.filter((a) => a.points === 2).length;
    const threePtMade = madeShots.filter((a) => a.points === 3).length;

    const onePtAttempts = shots.filter((a) => a.points === 1).length;
    const twoPtAttempts = shots.filter((a) => a.points === 2).length;
    const threePtAttempts = shots.filter((a) => a.points === 3).length;

    const totalPoints = onePtMade * 1 + twoPtMade * 2 + threePtMade * 3;

    // Rebounds
    const rebounds = playerActions.filter((a) => a.type === ActionType.REBOUND);
    const offRebounds = rebounds.filter(
      (a) => a.specification === ReboundSpecification.OFFENSIVE
    ).length;
    const defRebounds = rebounds.filter(
      (a) => a.specification === ReboundSpecification.DEFENSIVE
    ).length;

    // Fouls
    const fouls = playerActions.filter((a) => a.type === ActionType.FOUL);
    const personalFouls = fouls.filter(
      (a) => a.specification === FoulSpecification.PERSONAL
    ).length;
    const technicalFouls = fouls.filter(
      (a) => a.specification === FoulSpecification.TECHNICAL
    ).length;
    const penalityFouls = fouls.filter(
      (a) => a.specification === FoulSpecification.PENALITY
    ).length;
    const disqualificationFouls = fouls.filter(
      (a) => a.specification === FoulSpecification.DISQUALIFICATION
    ).length;

    // New stats
    const assists = playerActions.filter(
      (a) => a.type === ActionType.ASSIST
    ).length;
    const steals = playerActions.filter(
      (a) => a.type === ActionType.STEAL
    ).length;
    const blocks = playerActions.filter(
      (a) => a.type === ActionType.BLOCK
    ).length;
    const turnovers = playerActions.filter(
      (a) => a.type === ActionType.TURNOVER
    ).length;

    return {
      points: totalPoints,
      fgm: twoPtMade + threePtMade,
      fga: twoPtAttempts + threePtAttempts,
      twopm: twoPtMade,
      twopa: twoPtAttempts,
      threepm: threePtMade,
      threepa: threePtAttempts,
      ftm: onePtMade,
      fta: onePtAttempts,
      orb: offRebounds,
      drb: defRebounds,
      trb: offRebounds + defRebounds,
      pf: personalFouls,
      tf: technicalFouls,
      uf: penalityFouls, // unsportsmanlike fouls (antisportive)
      df: disqualificationFouls, // disqualifying fouls
      ast: assists,
      stl: steals,
      blk: blocks,
      tov: turnovers,
    };
  }

  /**
   * Stats legend constant
   */
  private static readonly STATS_LEGEND = `PTS: Points | 2PTS: 2 points (marqués/tentés) | 3PTS: 3 points (marqués/tentés) | LF: Lancers francs (marqués/tentés)<br>
      RO: Rebonds offensifs | RD: Rebonds défensifs<br>
      PD: Passes décisives | INT: Interceptions | CT: Contres | BP: Balles perdues | F: Fautes totales`;

  /**
   * Calculate team totals from individual player stats
   */
  private static calculateTeamTotals(stats: any[]) {
    return {
      points: stats.reduce((sum, p) => sum + p.stats.points, 0),
      twopm: stats.reduce((sum, p) => sum + p.stats.twopm, 0),
      twopa: stats.reduce((sum, p) => sum + p.stats.twopa, 0),
      threepm: stats.reduce((sum, p) => sum + p.stats.threepm, 0),
      threepa: stats.reduce((sum, p) => sum + p.stats.threepa, 0),
      ftm: stats.reduce((sum, p) => sum + p.stats.ftm, 0),
      fta: stats.reduce((sum, p) => sum + p.stats.fta, 0),
      orb: stats.reduce((sum, p) => sum + p.stats.orb, 0),
      drb: stats.reduce((sum, p) => sum + p.stats.drb, 0),
      ast: stats.reduce((sum, p) => sum + p.stats.ast, 0),
      stl: stats.reduce((sum, p) => sum + p.stats.stl, 0),
      blk: stats.reduce((sum, p) => sum + p.stats.blk, 0),
      tov: stats.reduce((sum, p) => sum + p.stats.tov, 0),
      fouls: stats.reduce((sum, p) => sum + this.calculateTotalFouls(p.stats), 0),
    };
  }

  /**
   * Generate team stats table HTML
   */
  private static generateTeamStatsTable(
    teamName: string,
    stats: any[],
    teamClass: "team-a" | "team-b"
  ): string {
    if (stats.length === 0) return "";

    const totals = this.calculateTeamTotals(stats);

    return `
  <div class="stats-section ${teamClass}">
    <h2>${teamName} - Statistiques individuelles</h2>
    <table class="stats-table">
      <thead>
        <tr>
          <th class="player-number">#</th>
          <th class="player-name">Joueur</th>
          <th>PTS</th>
          <th>2PTS</th>
          <th>3PTS</th>
          <th>LF</th>
          <th>RO</th>
          <th>RD</th>
          <th>PD</th>
          <th>INT</th>
          <th>CT</th>
          <th>BP</th>
          <th>F</th>
        </tr>
      </thead>
      <tbody>
        ${stats
          .map((player) => {
            const totalFouls = this.calculateTotalFouls(player.stats);
            return `
        <tr>
          <td class="player-number">${player.num}</td>
          <td class="player-name">${player.name}</td>
          <td>${player.stats.points}</td>
          <td>${player.stats.twopm}/${player.stats.twopa}</td>
          <td>${player.stats.threepm}/${player.stats.threepa}</td>
          <td>${player.stats.ftm}/${player.stats.fta}</td>
          <td>${player.stats.orb}</td>
          <td>${player.stats.drb}</td>
          <td>${player.stats.ast}</td>
          <td>${player.stats.stl}</td>
          <td>${player.stats.blk}</td>
          <td>${player.stats.tov}</td>
          <td>${totalFouls}</td>
        </tr>
        `;
          })
          .join("")}
        <tr class="totals-row">
          <td colspan="2">TOTAL</td>
          <td>${totals.points}</td>
          <td>${totals.twopm}/${totals.twopa}</td>
          <td>${totals.threepm}/${totals.threepa}</td>
          <td>${totals.ftm}/${totals.fta}</td>
          <td>${totals.orb}</td>
          <td>${totals.drb}</td>
          <td>${totals.ast}</td>
          <td>${totals.stl}</td>
          <td>${totals.blk}</td>
          <td>${totals.tov}</td>
          <td>${totals.fouls}</td>
        </tr>
      </tbody>
    </table>
    <div class="legend">
      ${this.STATS_LEGEND}
    </div>
  </div>
  `;
  }

  /**
   * Generate score evolution SVG chart
   */
  private static generateScoreChart(
    cumulativeScoresMyTeam: number[],
    cumulativeScoresOpponent: number[],
    periodLabel: string,
    totalPeriods: number,
    trackOpponentStats: boolean,
    myTeamName: string,
    opponentName: string
  ): string {
    const width = 500;
    const height = 200;
    const padding = { top: 30, right: 30, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxScore = Math.max(
      ...cumulativeScoresMyTeam,
      ...(trackOpponentStats ? cumulativeScoresOpponent : [0])
    );
    const yScale = chartHeight / (maxScore || 1);

    // Include 0 at start
    const allScoresMyTeam = [0, ...cumulativeScoresMyTeam];
    const allScoresOpponent = [0, ...cumulativeScoresOpponent];

    // Generate path for my team
    let pathMyTeam = `M ${padding.left} ${padding.top + chartHeight}`;
    allScoresMyTeam.forEach((score, i) => {
      const x = padding.left + (i * chartWidth) / totalPeriods;
      const y = padding.top + chartHeight - score * yScale;
      pathMyTeam += ` L ${x} ${y}`;
    });

    // Generate path for opponent
    let pathOpponent = `M ${padding.left} ${padding.top + chartHeight}`;
    if (trackOpponentStats) {
      allScoresOpponent.forEach((score, i) => {
        const x = padding.left + (i * chartWidth) / totalPeriods;
        const y = padding.top + chartHeight - score * yScale;
        pathOpponent += ` L ${x} ${y}`;
      });
    }

    // Generate X-axis labels with "FIN" above period labels
    const xLabelsHTML = Array.from({ length: totalPeriods + 1 }, (_, i) => {
      const x = padding.left + (i * chartWidth) / totalPeriods;
      if (i === 0) {
        return `<text x="${x}" y="${
          height - 10
        }" text-anchor="middle" font-size="10">Début</text>`;
      }
      return `
        <text x="${x}" y="${
        height - 18
      }" text-anchor="middle" font-size="9">FIN</text>
        <text x="${x}" y="${
        height - 8
      }" text-anchor="middle" font-size="10" font-weight="bold">${periodLabel}${i}</text>
      `;
    }).join("");

    // Generate Y-axis labels
    const ySteps = 5;
    const yLabelsHTML = Array.from({ length: ySteps + 1 }, (_, i) => {
      const value = Math.round((maxScore / ySteps) * i);
      const y = padding.top + chartHeight - value * yScale;
      return `<text x="${padding.left - 5}" y="${
        y + 3
      }" text-anchor="end" font-size="9">${value}</text>`;
    }).join("");

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            text { font-family: Arial, sans-serif; fill: #333; }
          </style>
        </defs>

        <!-- Grid lines -->
        ${Array.from({ length: ySteps + 1 }, (_, i) => {
          const y = padding.top + chartHeight - (chartHeight / ySteps) * i;
          return `<line x1="${padding.left}" y1="${y}" x2="${
            width - padding.right
          }" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>`;
        }).join("")}

        <!-- Axes -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${
      padding.left
    }" y2="${padding.top + chartHeight}" stroke="#333" stroke-width="2"/>
        <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${
      width - padding.right
    }" y2="${padding.top + chartHeight}" stroke="#333" stroke-width="2"/>

        <!-- My Team line (always shown) -->
        <path d="${pathMyTeam}" fill="none" stroke="#FF6B35" stroke-width="3"/>
        ${allScoresMyTeam
          .map((score, i) => {
            const x = padding.left + (i * chartWidth) / totalPeriods;
            const y = padding.top + chartHeight - score * yScale;
            return `<circle cx="${x}" cy="${y}" r="4" fill="#FF6B35"/>`;
          })
          .join("")}

        ${
          trackOpponentStats
            ? `
        <!-- Opponent line -->
        <path d="${pathOpponent}" fill="none" stroke="#004E89" stroke-width="3"/>
        ${allScoresOpponent
          .map((score, i) => {
            const x = padding.left + (i * chartWidth) / totalPeriods;
            const y = padding.top + chartHeight - score * yScale;
            return `<circle cx="${x}" cy="${y}" r="4" fill="#004E89"/>`;
          })
          .join("")}
        `
            : ""
        }

        <!-- Labels -->
        ${xLabelsHTML}
        ${yLabelsHTML}

        <!-- Legend -->
        <circle cx="50" cy="15" r="4" fill="#FF6B35"/>
        <text x="58" y="18" font-size="10">${myTeamName}</text>

        ${
          trackOpponentStats
            ? `
        <circle cx="150" cy="15" r="4" fill="#004E89"/>
        <text x="158" y="18" font-size="10">${opponentName}</text>
        `
            : ""
        }
      </svg>
    `;
  }

  /**
   * Generate full basketball court SVG (same as BasketballCourtSVG component)
   * This reuses the exact same SVG paths as the component for consistency
   */
  private static generateBasketballCourtSVG(
    width: number,
    height: number,
    backgroundColor: string = "#1a472a",
    lineColor: string = "#FFFFFF",
    markers: CourtMarker[] = [],
    logoUrl?: string | null
  ): string {
    const SVG_WIDTH = 615.75;
    const SVG_HEIGHT = 1146.749971;

    // Markers are already in viewBox coordinates (0-615.75 x 0-1146.75)
    // The viewBox attribute handles scaling automatically to the specified width/height
    const renderMarkers = markers
      .map((marker) => {
        return `<circle cx="${marker.svgX}" cy="${marker.svgY}" r="8" fill="${
          marker.color || "#FF0000"
        }" stroke="#FFFFFF" stroke-width="2"/>`;
      })
      .join("");

    // Center logo - use club logo if provided, otherwise display app logo
    const renderCenterLogo = logoUrl
      ? `
      <defs>
        <clipPath id="logoClipPortrait">
          <circle cx="307" cy="573" r="76" />
        </clipPath>
      </defs>
      <image
        href="${logoUrl}"
        x="231"
        y="497"
        width="152"
        height="152"
        preserveAspectRatio="xMidYMid slice"
        clip-path="url(#logoClipPortrait)"
      />
    `
      : `
      <!-- App logo when no club logo - sized to fit inside circle radius 76 -->
      <image
        href="${this.generateAppLogoSVG("#FF8C42", "#000000", true)}"
        x="245"
        y="511"
        width="124"
        height="124"
        preserveAspectRatio="xMidYMid meet"
      />
    `;

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <!-- Court background -->
        <path fill="${backgroundColor}" d="M0 0h615.75v1146.749971H0z" />

        <defs>
          <clipPath id="a"><path d="M.164.11h614.75v1145.406H.164zm0 0" /></clipPath>
          <clipPath id="b"><path d="M37.32.11h540.27V341H37.32zm0 0" /></clipPath>
          <clipPath id="c"><path d="M217.508 325.324c27.695 9.422 59.187 15.602 90.094 15.602 30.906 0 60.644-5.297 88.05-14.719.586-.293 1.168-.293 1.75-.586C500.324 287.941 576.132 188.45 577.59 79.38V.109H37.32V79.32c1.457 109.72 76.098 209.211 180.188 246.004zm0 0" /></clipPath>
          <clipPath id="d"><path d="M207.52.11h199.875v240.644H207.52zm0 0" /></clipPath>
          <clipPath id="e"><path d="M232.645.11h149.937v240.648H232.645zm0 0" /></clipPath>
          <clipPath id="f"><path d="M231.934 497.29h151.043v151.042H231.934zm0 0" /></clipPath>
          <clipPath id="g"><path d="M382.977 572.813c0-41.711-33.813-75.524-75.524-75.524-41.707 0-75.52 33.813-75.52 75.524 0 41.707 33.813 75.519 75.52 75.519 41.711 0 75.524-33.812 75.524-75.52zm0 0" /></clipPath>
          <clipPath id="h"><path d="M0 0H152V152H0z" /></clipPath>
          <clipPath id="i"><path d="M.934.29h151.043v151.042H.934zm0 0" /></clipPath>
          <clipPath id="j"><path d="M151.977 75.813c0-41.711-33.813-75.524-75.524-75.524C34.746.29.933 34.102.933 75.812c0 41.708 33.813 75.52 75.52 75.52 41.711 0 75.524-33.812 75.524-75.52zm0 0" /></clipPath>
          <clipPath id="k"><path d="M232.29 497.29h150.687v150.69H232.289zm0 0" /></clipPath>
          <clipPath id="l"><path d="M382.977 572.813c0-41.711-33.813-75.524-75.52-75.524-41.71 0-75.52 33.813-75.52 75.524 0 41.707 33.81 75.519 75.52 75.519 41.707 0 75.52-33.812 75.52-75.52zm0 0" /></clipPath>
          <clipPath id="m"><path d="M380 570h235.5v6H380zm0 0" /></clipPath>
          <clipPath id="n"><path d="M255.77 48.574h103.457v68.969H255.77zm0 0" /></clipPath>
          <clipPath id="o"><path d="M324.691 114.55c-5.293 1.805-11.343 2.993-17.265 2.993a51.97 51.97 0 01-16.88-2.82c-.112-.059-.222-.059-.335-.114-19.727-7.222-34.254-26.293-34.535-47.273V48.809h103.55v18.515c-.277 21.106-14.585 40.176-34.535 47.227zm0 0" /></clipPath>
          <clipPath id="p"><path d="M260.371 40.34h94.172v21.37h-94.172zm0 0" /></clipPath>
          <clipPath id="q"><path d="M0 0H95V22H0z" /></clipPath>
          <clipPath id="r"><path d="M.371.34h94.172v21.37H.371zm0 0" /></clipPath>
          <clipPath id="s"><path d="M298.188 56.473h18.742v18.742h-18.743zm0 0" /></clipPath>
          <clipPath id="t"><path d="M316.93 65.95c0-5.235-4.246-9.477-9.477-9.477a9.476 9.476 0 00-9.476 9.476 9.476 9.476 0 009.476 9.477c5.23 0 9.477-4.242 9.477-9.477zm0 0" /></clipPath>
          <clipPath id="u"><path d="M232.645 236.316h149.937v74.97H232.645zm0 0" /></clipPath>
          <clipPath id="v"><path d="M332.469 306.95c-7.676 2.616-16.461 4.335-25.055 4.335a75.335 75.335 0 01-24.488-4.094c-.16-.078-.324-.078-.485-.16-28.625-10.48-49.707-38.148-50.113-68.047v-2.902h150.254v2.898c-.406 30.067-21.164 57.735-50.113 67.97zm0 0" /></clipPath>
          <clipPath id="w"><path d="M232.645 161.281h149.94v149.934h-149.94zm0 0" /></clipPath>
          <clipPath id="x"><path d="M382.586 236.281c0-41.422-33.637-75-75.129-75-41.492 0-75.129 33.578-75.129 75s33.637 75.004 75.129 75.004c41.492 0 75.129-33.582 75.129-75.004zm0 0" /></clipPath>
          <clipPath id="y"><path d="M37.32 805h540.274v340.836H37.32zm0 0" /></clipPath>
          <clipPath id="z"><path d="M397.406 820.617c-27.699-9.418-59.187-15.597-90.094-15.597a270.976 270.976 0 00-88.054 14.718c-.582.293-1.164.293-1.746.586-102.926 37.68-178.73 137.172-180.192 246.242v79.27h540.274v-79.211c-1.457-109.719-76.098-209.21-180.188-246.008zm0 0" /></clipPath>
          <clipPath id="A"><path d="M207.52 905.188h199.878v240.648H207.52zm0 0" /></clipPath>
          <clipPath id="B"><path d="M232.332 905.188H382.27v240.648H232.332zm0 0" /></clipPath>
          <clipPath id="C"><path d="M255.68 1028.402h103.46v68.97H255.68zm0 0" /></clipPath>
          <clipPath id="D"><path d="M290.219 1031.39c5.289-1.804 11.344-2.988 17.265-2.988a51.97 51.97 0 0116.88 2.82c.109.055.222.055.331.114 19.727 7.219 34.258 26.289 34.54 47.27v18.527H255.68v-18.512c.28-21.11 14.586-40.176 34.539-47.23zm0 0" /></clipPath>
          <clipPath id="E"><path d="M260.367 1084.234h94.172v21.371h-94.172zm0 0" /></clipPath>
          <clipPath id="F"><path d="M0 0H95V22H0z" /></clipPath>
          <clipPath id="G"><path d="M.367.234H94.54v21.371H.367zm0 0" /></clipPath>
          <clipPath id="H"><path d="M297.984 1070.723h18.743v18.742h-18.743zm0 0" /></clipPath>
          <clipPath id="I"><path d="M297.984 1079.988a9.476 9.476 0 009.477 9.477 9.476 9.476 0 009.476-9.477 9.476 9.476 0 00-9.476-9.476 9.476 9.476 0 00-9.477 9.476zm0 0" /></clipPath>
          <clipPath id="J"><path d="M232.332 834.66H382.27v74.969H232.332zm0 0" /></clipPath>
          <clipPath id="K"><path d="M282.441 838.996c7.68-2.617 16.461-4.336 25.055-4.336a75.318 75.318 0 0124.488 4.094c.164.082.329.082.489.164 28.625 10.477 49.707 38.144 50.113 68.043v2.902H232.332v-2.898c.402-30.063 21.16-57.735 50.11-67.969zm0 0" /></clipPath>
          <clipPath id="L"><path d="M232.332 834.73H382.27v149.938H232.332zm0 0" /></clipPath>
          <clipPath id="M"><path d="M232.332 909.664c0 41.422 33.633 75.004 75.125 75.004s75.129-33.582 75.129-75.004c0-41.422-33.637-75-75.129-75-41.492 0-75.125 33.578-75.125 75zm0 0" /></clipPath>
        </defs>

        <g clip-path="url(#a)">
          <path fill="none" d="M614.914.11v1145.406H0V.11zm0 0" stroke="${lineColor}" stroke-width="14.994"/>
        </g>
        <g clip-path="url(#b)">
          <g clip-path="url(#c)">
            <path fill="none" d="M217.508 325.324c27.695 9.422 59.187 15.602 90.094 15.602 30.906 0 60.644-5.297 88.05-14.719.586-.293 1.169-.293 1.75-.586C500.325 287.941 576.134 188.45 577.59 79.38V.109H37.32V79.32c1.457 109.72 76.098 209.211 180.188 246.004zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <g clip-path="url(#d)">
          <path fill="none" d="M407.395.11v240.644H207.519V.11zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
        </g>
        <g clip-path="url(#e)">
          <path fill="none" d="M382.582.11v240.648H232.328V.109zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
        </g>
        <g clip-path="url(#f)">
          <g clip-path="url(#g)">
            <g clip-path="url(#h)" transform="translate(231 497)">
              <g clip-path="url(#i)">
                <g clip-path="url(#j)">
                  <path fill="${backgroundColor}" d="M151.977.29v151.042H.934V.289zm0 0"/>
                </g>
              </g>
            </g>
          </g>
        </g>
        <g clip-path="url(#k)">
          <g clip-path="url(#l)">
            <path fill="none" d="M382.977 572.813c0-41.711-33.813-75.524-75.52-75.524-41.711 0-75.52 33.813-75.52 75.524 0 41.707 33.809 75.52 75.52 75.52 41.707 0 75.52-33.813 75.52-75.52zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <path fill="none" d="M231.926 572.812H-.012" stroke="${lineColor}" stroke-width="4.498"/>
        <g clip-path="url(#m)">
          <path fill="none" d="M614.902 572.812H382.97" stroke="${lineColor}" stroke-width="4.498"/>
        </g>
        <g clip-path="url(#n)">
          <g clip-path="url(#o)">
            <path fill="none" d="M324.691 114.55c-5.293 1.805-11.343 2.993-17.265 2.993a51.97 51.97 0 01-16.88-2.82c-.112-.059-.222-.059-.335-.114-19.727-7.222-34.254-26.293-34.535-47.273V48.809h103.55v18.515c-.277 21.106-14.585 40.176-34.535 47.227zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <g clip-path="url(#p)">
          <g clip-path="url(#q)" transform="translate(260 40)">
            <g clip-path="url(#r)">
              <path fill="${backgroundColor}" d="M94.543.34v21.37H.367V.34zm0 0"/>
            </g>
          </g>
        </g>
        <g clip-path="url(#s)">
          <g clip-path="url(#t)">
            <path fill="none" d="M316.93 65.95c0-5.235-4.246-9.477-9.477-9.477a9.476 9.476 0 00-9.476 9.476 9.476 9.476 0 009.476 9.477c5.23 0 9.477-4.242 9.477-9.477zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <path fill="none" d="M307.453 56.469V45.44" stroke="${lineColor}" stroke-width="4.498"/>
        <path fill="none" d="M343.637 48.809h-72.383" stroke="${lineColor}" stroke-width="6.747"/>
        <g clip-path="url(#u)">
          <g clip-path="url(#v)">
            <path fill="none" d="M332.469 306.95c-7.676 2.616-16.461 4.335-25.055 4.335a75.335 75.335 0 01-24.488-4.094c-.16-.078-.324-.078-.485-.16-28.625-10.48-49.707-38.148-50.113-68.047v-2.902h150.254v2.898c-.406 30.067-21.164 57.735-50.113 67.97zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <g clip-path="url(#w)">
          <g clip-path="url(#x)">
            <path fill="${lineColor}" d="M376.078 219.508a69.77 69.77 0 00-4.11-11.973l8.212-3.68a78.798 78.798 0 014.636 13.52zm-5.953-15.778a70.185 70.185 0 00-6.86-10.664l7.102-5.527a79.246 79.246 0 017.73 12.027zm-9.559-13.93a70.965 70.965 0 00-9.191-8.738l5.594-7.046a79.632 79.632 0 0110.355 9.847zm-12.59-11.273a70.182 70.182 0 00-10.988-6.308l3.762-8.176a79.437 79.437 0 0112.39 7.117zm-14.878-7.96a69.65 69.65 0 00-12.176-3.508l1.703-8.836c4.7.906 9.277 2.226 13.734 3.96zm-16.344-4.184a71.551 71.551 0 00-12.707-.524l-.426-8.988a80.63 80.63 0 0114.305.59zm-16.91-.2a70.17 70.17 0 00-12.43 2.473l-2.547-8.629a79.05 79.05 0 0114.02-2.789zm-16.453 3.794a69.96 69.96 0 00-11.473 5.363l-4.527-7.774a79.1 79.1 0 0112.941-6.05zm-15.063 7.597a71.155 71.155 0 00-9.894 7.953l-6.239-6.484a80.267 80.267 0 0111.149-8.957zm-12.851 10.977a70.6 70.6 0 00-7.735 10.058l-7.594-4.82a79.47 79.47 0 018.715-11.336zm-9.891 13.699a69.693 69.693 0 00-5.106 11.586l-8.527-2.863a78.61 78.61 0 015.762-13.078zm-6.328 15.629a69.739 69.739 0 00-2.184 12.48l-8.965-.746a78.908 78.908 0 012.461-14.078zm-2.41 16.703a70.946 70.946 0 00.832 12.68l-8.89 1.394a80.252 80.252 0 01-.935-14.289zm1.609 16.828a69.778 69.778 0 003.816 12.07l-8.296 3.48a78.874 78.874 0 01-4.309-13.624zm5.57 15.926a70.337 70.337 0 006.602 10.82l-7.23 5.356a79.398 79.398 0 01-7.442-12.203zm9.223 14.148a71.227 71.227 0 008.98 8.954l-5.757 6.91a79.608 79.608 0 01-10.118-10.086zm12.313 11.567a70.669 70.669 0 0010.84 6.574l-3.954 8.082a79.543 79.543 0 01-12.222-7.414zm14.699 8.32a69.837 69.837 0 0012.082 3.797l-1.914 8.793a79.327 79.327 0 01-13.633-4.285zm16.23 4.57a71.263 71.263 0 0012.684.825l.215 8.992a80.343 80.343 0 01-14.281-.926zm16.91.598a70.47 70.47 0 0012.485-2.176l2.336 8.688a79.626 79.626 0 01-14.075 2.457zm16.528-3.394a70.065 70.065 0 0011.597-5.09l4.344 7.882a79.378 79.378 0 01-13.086 5.739zm15.242-7.243a70.394 70.394 0 0010.078-7.71l6.086 6.628a79.489 79.489 0 01-11.36 8.688zm13.11-10.664a70.612 70.612 0 007.972-9.875l7.476 5a79.523 79.523 0 01-8.98 11.13zm10.214-13.457a70.146 70.146 0 005.383-11.465l8.453 3.075a78.794 78.794 0 01-6.07 12.933zm6.703-15.48a69.872 69.872 0 002.485-12.426l8.945.957a79.117 79.117 0 01-2.8 14.023zm2.809-16.63c.05-1.128.078-2.257.078-3.39 0-4.265-.375-8.476-1.129-12.636l8.852-1.606a79.93 79.93 0 011.273 14.242c0 1.278-.027 2.547-.09 3.817zm0 0"/>
          </g>
        </g>
        <g clip-path="url(#y)">
          <g clip-path="url(#z)">
            <path fill="none" d="M397.406 820.617c-27.7-9.418-59.187-15.598-90.094-15.598a270.976 270.976 0 00-88.054 14.72c-.582.292-1.164.292-1.746.585C114.586 858.004 38.78 957.496 37.32 1066.566v79.27h540.274v-79.211c-1.457-109.719-76.098-209.211-180.188-246.008zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <g clip-path="url(#A)">
          <path fill="none" d="M207.52 1145.836V905.187h199.879v240.649zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
        </g>
        <g clip-path="url(#B)">
          <path fill="none" d="M232.332 1145.836V905.187h150.254v240.649zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
        </g>
        <g clip-path="url(#C)">
          <g clip-path="url(#D)">
            <path fill="none" d="M290.219 1031.39c5.289-1.804 11.344-2.988 17.265-2.988a51.97 51.97 0 0116.88 2.82c.109.055.222.055.331.114 19.727 7.219 34.258 26.289 34.54 47.27v18.527H255.68v-18.512c.28-21.11 14.586-40.176 34.539-47.23zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <g clip-path="url(#E)">
          <g clip-path="url(#F)" transform="translate(260 1084)">
            <g clip-path="url(#G)">
              <path fill="${backgroundColor}" d="M.367 21.605V.235h94.176v21.37zm0 0"/>
            </g>
          </g>
        </g>
        <g clip-path="url(#H)">
          <g clip-path="url(#I)">
            <path fill="none" d="M297.984 1079.988a9.476 9.476 0 009.477 9.477 9.476 9.476 0 009.477-9.477 9.476 9.476 0 00-9.477-9.476 9.476 9.476 0 00-9.477 9.476zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <path fill="none" d="M307.457 1089.477v11.027" stroke="${lineColor}" stroke-width="4.498"/>
        <path fill="none" d="M271.27 1097.137h72.382" stroke="${lineColor}" stroke-width="6.747"/>
        <g clip-path="url(#J)">
          <g clip-path="url(#K)">
            <path fill="none" d="M282.441 838.996c7.68-2.617 16.461-4.336 25.055-4.336a75.318 75.318 0 0124.488 4.094c.164.082.329.082.489.164 28.625 10.477 49.707 38.145 50.113 68.043v2.902H232.332v-2.898c.402-30.063 21.16-57.735 50.11-67.969zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <g clip-path="url(#L)">
          <g clip-path="url(#M)">
            <path fill="${lineColor}" d="M238.84 926.438a69.912 69.912 0 004.105 11.976l-8.21 3.676a79.094 79.094 0 01-4.637-13.516zm5.95 15.777a70.718 70.718 0 006.858 10.668l-7.097 5.523a79.126 79.126 0 01-7.735-12.023zm9.558 13.93a70.952 70.952 0 009.191 8.738l-5.594 7.047a79.833 79.833 0 01-10.351-9.844zm12.59 11.273a70.204 70.204 0 0010.988 6.312l-3.762 8.172a79.377 79.377 0 01-12.387-7.113zm14.878 7.96a70.199 70.199 0 0012.176 3.513l-1.699 8.832a78.69 78.69 0 01-13.738-3.957zm16.344 4.184c3.074.407 6.176.606 9.297.606 1.14 0 2.277-.027 3.41-.078l.426 8.984c-1.273.063-2.555.09-3.836.09-3.516 0-7.004-.226-10.465-.68zm16.914.204a70.317 70.317 0 0012.43-2.477l2.543 8.629a79.34 79.34 0 01-14.02 2.793zm16.45-3.793a69.998 69.998 0 0011.472-5.368l4.531 7.778a79.578 79.578 0 01-12.941 6.05zm15.062-7.602c3.535-2.351 6.832-5 9.894-7.95l6.239 6.481a79.754 79.754 0 01-11.149 8.957zm12.855-10.973a70.896 70.896 0 007.73-10.062l7.599 4.82a79.79 79.79 0 01-8.715 11.34zm9.891-13.699a70.183 70.183 0 005.102-11.59l8.527 2.868a78.877 78.877 0 01-5.758 13.078zm6.328-15.633a70.398 70.398 0 002.184-12.476l8.965.746a78.976 78.976 0 01-2.465 14.078zm2.406-16.703a70.981 70.981 0 00-.828-12.68l8.887-1.39a79.684 79.684 0 01.938 14.285zm-1.605-16.824a69.602 69.602 0 00-3.82-12.074l8.296-3.48a78.685 78.685 0 014.31 13.628zm-5.574-15.926a70.434 70.434 0 00-6.598-10.82l7.227-5.356a79.026 79.026 0 017.441 12.204zm-9.223-14.148a70.71 70.71 0 00-8.976-8.957l5.757-6.91a80.154 80.154 0 0110.118 10.09zm-12.312-11.57a70.669 70.669 0 00-10.84-6.575l3.957-8.078a79.671 79.671 0 0112.219 7.41zm-14.696-8.317a70.063 70.063 0 00-12.082-3.8l1.91-8.79a78.88 78.88 0 0113.633 4.285zm-16.23-4.574a71.314 71.314 0 00-12.688-.824l-.215-8.992a79.947 79.947 0 0114.285.93zm-16.91-.598a70.513 70.513 0 00-12.489 2.176l-2.336-8.687a79.663 79.663 0 0114.079-2.454zm-16.532 3.399a70.047 70.047 0 00-11.597 5.086l-4.34-7.88a79.01 79.01 0 0113.082-5.738zm-15.242 7.238a70.832 70.832 0 00-10.078 7.71l-6.082-6.628a79.741 79.741 0 0111.356-8.688zm-13.11 10.664a70.867 70.867 0 00-7.968 9.875l-7.48-5a80.006 80.006 0 018.984-11.129zm-10.21 13.461a69.785 69.785 0 00-5.383 11.46l-8.457-3.07a78.983 78.983 0 016.074-12.933zm-6.707 15.48a69.795 69.795 0 00-2.48 12.426l-8.946-.96a79.074 79.074 0 012.8-14.02zm-2.805 16.625a70.682 70.682 0 001.05 16.027l-8.855 1.606a79.93 79.93 0 01-1.273-14.242c0-1.273.031-2.547.09-3.816zm0 0"/>
          </g>
        </g>

        <!-- Render markers on top of court -->
        ${renderMarkers}

        <!-- Render center court logo if provided -->
        ${renderCenterLogo}
      </svg>
    `;
  }

  /**
   * Generate SVG court for player shots using the full court component
   */
  private static generatePlayerShotCourt(
    actions: any[],
    playerId: number,
    backgroundColor: string = "#1a472a",
    lineColor: string = "#FFFFFF",
    logoUrl?: string | null
  ): string {
    const width = 250;
    const height = 465;
    const shotActions = actions.filter(
      (a) => a.type === ActionType.SHOT && a.player === playerId
    );

    if (shotActions.length === 0) {
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="125" y="232" text-anchor="middle" font-size="14" fill="#999">Aucun tir</text></svg>`;
    }

    const markers: CourtMarker[] = shotActions.map((action, index) => {
      return {
        id: `shot-${index}`,
        svgX: action.semanticPosition.xNormalized * 615.75,
        svgY: action.semanticPosition.yNormalized * 1146.749971,
        color: getActionColor(action.type, action.specification, action.points),
      };
    });

    return this.generateBasketballCourtSVG(
      width,
      height,
      backgroundColor,
      lineColor,
      markers,
      logoUrl
    );
  }

  /**
   * Generate SVG court for player actions (non-shots) using the full court component
   */
  private static generatePlayerActionCourt(
    actions: any[],
    playerId: number,
    backgroundColor: string = "#1a472a",
    lineColor: string = "#FFFFFF",
    logoUrl?: string | null
  ): string {
    const width = 250;
    const height = 465;
    const nonShotActions = actions.filter(
      (a) => a.player === playerId && a.type !== ActionType.SHOT
    );

    if (nonShotActions.length === 0) {
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="125" y="232" text-anchor="middle" font-size="14" fill="#999">Aucune action</text></svg>`;
    }

    const markers: CourtMarker[] = nonShotActions.map((action, index) => {
      return {
        id: `action-${index}`,
        svgX: (action.semanticPosition?.xNormalized || 0.5) * 615.75,
        svgY: (action.semanticPosition?.yNormalized || 0.5) * 1146.749971,
        color: getActionColor(action.type, action.specification, action.points),
      };
    });

    return this.generateBasketballCourtSVG(
      width,
      height,
      backgroundColor,
      lineColor,
      markers,
      logoUrl
    );
  }

  /**
   * Generate HTML template for PDF
   */
  private static generateHTML(data: {
    myTeamName: string;
    opponentName: string;
    myTeamScore: number;
    opponentScore: number;
    matchDate: Date;
    periodLabel: string;
    totalPeriods: number;
    periodScoresMyTeam: number[];
    periodScoresOpponent: number[];
    cumulativeScoresMyTeam: number[];
    cumulativeScoresOpponent: number[];
    statsMyTeam: any[];
    statsOpponent: any[];
    trackOpponentStats: boolean;
    watermark?: boolean;
    scoreManuallyAdjusted?: boolean;
    clubLogoUrl?: string;
    courtBackgroundColor?: string;
    courtLineColor?: string;
    actions: any[];
    players: Player[];
    matchFormat: "2_halves" | "4_quarters";
    periodDuration: number;
  }): string {
    const {
      myTeamName,
      opponentName,
      myTeamScore,
      opponentScore,
      matchDate,
      periodLabel,
      totalPeriods,
      periodScoresMyTeam,
      periodScoresOpponent,
      cumulativeScoresMyTeam,
      cumulativeScoresOpponent,
      statsMyTeam,
      statsOpponent,
      trackOpponentStats,
      watermark = false,
      scoreManuallyAdjusted = false,
      clubLogoUrl,
      courtBackgroundColor = "#1a472a",
      courtLineColor = "#FFFFFF",
      actions,
      players,
      matchFormat,
      periodDuration,
    } = data;

    // Generate the score chart SVG
    const chartSVG = this.generateScoreChart(
      cumulativeScoresMyTeam,
      cumulativeScoresOpponent,
      periodLabel,
      totalPeriods,
      trackOpponentStats,
      myTeamName,
      opponentName
    );

    const dateStr = matchDate.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // App logo
    const AppLogoSVG = this.generateAppLogoSVG();

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      font-size: 10px;
      position: relative;
    }
    ${
      watermark
        ? `
    body::before {
      content: 'PREVIEW';
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120px;
      font-weight: bold;
      color: rgba(255, 107, 53, 0.15);
      z-index: 9999;
      pointer-events: none;
      white-space: nowrap;
    }
    `
        : ""
    }
    .header {
      position: relative;
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      padding-top: 10px;
      min-height: 100px;
    }
    .header-logo-left {
      position: absolute;
      left: 0;
      top: 0;
      height: 80px;
      width: auto;
    }
    .header-logo-right {
      position: absolute;
      right: 0;
      top: -30px;
      height: auto;
      width: 120px;
    }
    .header h1 {
      font-size: 18px;
      margin-bottom: 5px;
      margin-top: 0;
    }
    .header .match-info {
      font-size: 14px;
      font-weight: bold;
      margin: 10px 0;
    }
    .header .date {
      font-size: 11px;
      color: #666;
    }
    .score-summary {
      text-align: center;
      margin: 20px 0;
      font-size: 16px;
      font-weight: bold;
    }
    .score-summary .final-score {
      font-size: 24px;
      color: #000;
    }
    .period-scores {
      margin: 20px 0;
      width: 100%;
      border-collapse: collapse;
    }
    .period-scores th,
    .period-scores td {
      border: 1px solid #333;
      padding: 8px;
      text-align: center;
    }
    .period-scores th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .period-scores .team-name {
      text-align: left;
      font-weight: bold;
    }
    .stats-section {
      margin-top: 30px;
    }
    .stats-section h2 {
      font-size: 14px;
      margin-bottom: 10px;
      padding: 5px;
      color: white;
    }
    .stats-section.team-a h2 {
      background-color: #FF6B35;
    }
    .stats-section.team-b h2 {
      background-color: #004E89;
    }
    .stats-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .stats-table th,
    .stats-table td {
      border: 1px solid #333;
      padding: 6px 4px;
      text-align: center;
      font-size: 9px;
    }
    .stats-table th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .stats-table .player-number {
      font-weight: bold;
      width: 30px;
    }
    .stats-table .player-name {
      text-align: left;
      min-width: 100px;
    }
    .totals-row {
      font-weight: bold;
      background-color: #f9f9f9;
    }
    .legend {
      margin-top: 10px;
      font-size: 8px;
      color: #666;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 9px;
      color: #999;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }
    .warning-banner {
      background-color: #FFF3E0;
      border: 2px solid #FF9800;
      border-radius: 8px;
      padding: 10px;
      margin-top: 15px;
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      color: #E65100;
    }
    .individual-stats-section {
      position: relative;
    }
    .player-card-page {
      page-break-before: always;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
      padding-top: 20px;
      position: relative;
    }
    .player-card-page:last-child {
      page-break-after: avoid;
    }
    .player-card-header {
      text-align: center;
      margin-bottom: 10px;
      width: 100%;
      max-width: 800px;
      padding-bottom: 30px;
      padding-top: 10px;
      border-bottom: 1px solid #000;
    }
    .player-card-match-info {
      font-size: 16px;
      font-weight: bold;
      color: #333;
      margin-bottom: 6px;
    }
    .player-card-date {
      font-size: 12px;
      color: #666;
    }
    .player-card-logo {
      position: absolute;
      right: 20px;
      top: -10px;
      width: 100px;
      height: auto;
    }
    .player-card {
      border: 1px solid #e2e8f0;
      padding: 20px;
      margin-top: 20px;
      border-radius: 12px;
      max-width: 800px;
      width: 100%;
      page-break-inside: avoid;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .player-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e2e8f0;
    }
    .player-info-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .player-avatar {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
    }
    .player-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .player-name {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.2;
    }
    .player-number {
      font-size: 14px;
      color: #64748b;
      line-height: 1.2;
    }
    .player-points-badge {
      background: #fef3f2;
      border: 1px solid #FF8C42;
      border-radius: 999px;
      padding: 8px 16px;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .player-points-value {
      font-size: 24px;
      font-weight: 700;
      color: #FF8C42;
      line-height: 1;
    }
    .player-points-label {
      font-size: 11px;
      font-weight: 600;
      color: #FF8C42;
      text-transform: uppercase;
      line-height: 1;
    }
    .shooting-bars {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    .shooting-bar {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .shooting-bar-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      min-width: 50px;
      text-transform: uppercase;
    }
    .shooting-bar-track {
      flex: 1;
      height: 8px;
      background-color: #f1f5f9;
      border-radius: 999px;
      overflow: hidden;
      position: relative;
    }
    .shooting-bar-fill {
      height: 100%;
      border-radius: 999px;
      transition: width 0.3s ease;
    }
    .shooting-bar-value {
      font-size: 13px;
      color: #1e293b;
      min-width: 90px;
      text-align: right;
    }
    .shooting-bar-value-bold {
      font-weight: 700;
    }
    .shooting-bar-pct {
      color: #94a3b8;
      font-weight: 400;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .stat-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .stat-box.highlight {
      background: #fef3f2;
    }
    .stat-box-label {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      line-height: 1;
    }
    .stat-box-value {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      line-height: 1;
    }
    .stat-box-value.highlight {
      color: #FF8C42;
    }
    .courts-container {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
    }
    .court-wrapper {
      flex: 1;
      text-align: center;
    }
    .court-title {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .player-stats {
      margin-top: 15px;
      display: flex;
      gap: 20px;
    }
    .stats-column {
      flex: 1;
      padding: 10px;
    }
    .stats-column:first-child {
      border-right: 1px solid #333;
      padding-right: 20px;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
      font-size: 10px;
    }
    .stat-label {
      color: #666;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .stat-color-badge {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }
    .stat-value {
      color: #333;
      font-weight: 600;
    }
    .player-points-badge {
      display: inline-block;
      background-color: #333;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: bold;
      margin-left: 10px;
    }
    .no-stats {
      text-align: center;
      color: #999;
      font-style: italic;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    ${
      clubLogoUrl
        ? `<img src="${clubLogoUrl}" alt="Club Logo" class="header-logo-left" />`
        : ""
    }
    <img src="${AppLogoSVG}" alt="App" class="header-logo-right" />
    <h1>FEUILLE DE MATCH - BASKETBALL</h1>
    <div class="match-info">${myTeamName} vs ${opponentName}</div>
    <div class="date">${dateStr}</div>
  </div>

  <div class="score-summary">
    <div>SCORE FINAL</div>
    <div class="final-score">${myTeamScore} - ${opponentScore}</div>
    ${
      scoreManuallyAdjusted
        ? `
    <div class="warning-banner">
      ⚠️ Score ajusté manuellement - Les statistiques peuvent ne pas correspondre au score affiché
    </div>
    `
        : ""
    }
  </div>

  <!-- Period Scores -->
  <table class="period-scores">
    <thead>
      <tr>
        <th>Équipe</th>
        ${Array.from({ length: totalPeriods })
          .map((_, i) => `<th>${periodLabel}${i + 1}</th>`)
          .join("")}
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      <!-- My Team (always shown) -->
      <tr>
        <td class="team-name">${myTeamName}</td>
        ${periodScoresMyTeam.map((score) => `<td>${score}</td>`).join("")}
        <td><strong>${myTeamScore}</strong></td>
      </tr>
      ${
        trackOpponentStats
          ? `
      <!-- Opponent (only if tracked) -->
      <tr>
        <td class="team-name">${opponentName}</td>
        ${periodScoresOpponent.map((score) => `<td>${score}</td>`).join("")}
        <td><strong>${opponentScore}</strong></td>
      </tr>
      `
          : ""
      }
    </tbody>
  </table>

  <!-- Score Evolution Chart -->
  <div style="text-align: center; margin: 30px 0;">
    <h2 style="font-size: 14px; margin-bottom: 15px;">Évolution du score</h2>
    ${chartSVG}
  </div>

  ${this.generateTeamStatsTable(myTeamName, statsMyTeam, "team-a")}

  ${trackOpponentStats ? this.generateTeamStatsTable(opponentName, statsOpponent, "team-b") : ""}

  <!-- Individual Player Stats Section -->
  <div class="individual-stats-section">
    ${players
      .filter((p) => p.team === Team.MY_TEAM || (trackOpponentStats && p.team === Team.OPPONENT))
      .sort((a, b) => {
        if (a.team === b.team) return a.num - b.num;
        return a.team === Team.MY_TEAM ? -1 : 1;
      })
      .map((player) => {
        const playerStats = this.calculatePlayerStats(player.id, actions);
        const shotCourtSVG = this.generatePlayerShotCourt(
          actions,
          player.id,
          courtBackgroundColor,
          courtLineColor,
          clubLogoUrl
        );
        const actionCourtSVG = this.generatePlayerActionCourt(
          actions,
          player.id,
          courtBackgroundColor,
          courtLineColor,
          clubLogoUrl
        );

        // Calculate shooting percentages
        const twoPtPct = this.calculateShootingPercentage(
          playerStats.twopm,
          playerStats.twopa
        );
        const threePtPct = this.calculateShootingPercentage(
          playerStats.threepm,
          playerStats.threepa
        );
        const ftPct = this.calculateShootingPercentage(
          playerStats.ftm,
          playerStats.fta
        );

        const hasStats =
          actions.filter((a) => a.player === player.id).length > 0;
        const teamName = player.team === Team.MY_TEAM ? myTeamName : opponentName;
        const totalFouls = this.calculateTotalFouls(playerStats);
        const playerActions = actions.filter(a => a.player === player.id).length;
        const totalActions = actions.length;
        const totalMinutes = matchFormat === '2_halves' ? periodDuration * 2 : periodDuration * 4;
        const estimatedMinutes = totalActions > 0 ? Math.round((playerActions / totalActions) * totalMinutes) : 0;

        return `
    <div class="player-card-page">
      <img src="${AppLogoSVG}" alt="App" class="player-card-logo" />
      <div class="player-card-header">
        <div class="player-card-match-info">${myTeamName} ${myTeamScore} - ${opponentScore} ${opponentName}</div>
        <div class="player-card-date">${dateStr}</div>
      </div>
      <div class="player-card">
        <div class="player-header">
          <div class="player-info-left">
            <div class="player-avatar">${player.num}</div>
            <div class="player-info">
              <div class="player-name">${player.name}</div>
              <div class="player-number">#${player.num}</div>
            </div>
          </div>
          <div class="player-points-badge">
            <div class="player-points-value">${playerStats.points}</div>
            <div class="player-points-label">Points</div>
          </div>
        </div>

        <!-- Shooting Bars -->
        <div class="shooting-bars">
          <div class="shooting-bar">
            <div class="shooting-bar-label">3 PTS</div>
            <div class="shooting-bar-track">
              <div class="shooting-bar-fill" style="width: ${threePtPct}%; background-color: #6366f1;"></div>
            </div>
            <div class="shooting-bar-value">
              <span class="shooting-bar-value-bold">${playerStats.threepm}/${playerStats.threepa}</span>
              <span class="shooting-bar-pct"> (${threePtPct}%)</span>
            </div>
          </div>
          <div class="shooting-bar">
            <div class="shooting-bar-label">2 PTS</div>
            <div class="shooting-bar-track">
              <div class="shooting-bar-fill" style="width: ${twoPtPct}%; background-color: #3b82f6;"></div>
            </div>
            <div class="shooting-bar-value">
              <span class="shooting-bar-value-bold">${playerStats.twopm}/${playerStats.twopa}</span>
              <span class="shooting-bar-pct"> (${twoPtPct}%)</span>
            </div>
          </div>
          <div class="shooting-bar">
            <div class="shooting-bar-label">LANC</div>
            <div class="shooting-bar-track">
              <div class="shooting-bar-fill" style="width: ${ftPct}%; background-color: #06b6d4;"></div>
            </div>
            <div class="shooting-bar-value">
              <span class="shooting-bar-value-bold">${playerStats.ftm}/${playerStats.fta}</span>
              <span class="shooting-bar-pct"> (${ftPct}%)</span>
            </div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-box-label">MIN</div>
            <div class="stat-box-value">${estimatedMinutes}'</div>
          </div>
          <div class="stat-box">
            <div class="stat-box-label">REB</div>
            <div class="stat-box-value">${playerStats.orb + playerStats.drb}</div>
          </div>
          <div class="stat-box">
            <div class="stat-box-label">AST</div>
            <div class="stat-box-value">${playerStats.ast}</div>
          </div>
          <div class="stat-box">
            <div class="stat-box-label">INT</div>
            <div class="stat-box-value">${playerStats.stl}</div>
          </div>
          <div class="stat-box">
            <div class="stat-box-label">CTR</div>
            <div class="stat-box-value">${playerStats.blk}</div>
          </div>
          <div class="stat-box">
            <div class="stat-box-label">BP</div>
            <div class="stat-box-value">${playerStats.tov}</div>
          </div>
          <div class="stat-box">
            <div class="stat-box-label">FT</div>
            <div class="stat-box-value">${totalFouls}</div>
          </div>
          <div class="stat-box highlight">
            <div class="stat-box-label">ÉVAL</div>
            <div class="stat-box-value highlight">${playerStats.points + (playerStats.orb + playerStats.drb) + playerStats.ast + playerStats.stl + playerStats.blk - playerStats.tov - totalFouls}</div>
          </div>
        </div>

      ${
        hasStats
          ? `
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <div class="courts-container">
          <div class="court-wrapper">
            <div class="court-title">TIRS</div>
            ${shotCourtSVG}
          </div>
          <div class="court-wrapper">
            <div class="court-title">AUTRES ACTIONS</div>
            ${actionCourtSVG}
          </div>
        </div>
      </div>
      `
          : `
      <div class="no-stats">Aucune statistique enregistrée pour ce joueur</div>
      `
      }
      </div>
    </div>
        `;
      })
      .join("")}
  </div>
</body>
</html>
    `;
  }
}
