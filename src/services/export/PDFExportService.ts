import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
  FoulSpecification,
  getActionColor,
  renderMarkerSVG,
} from "../../models/ActionTypes";
import { Team } from "../../models/types";
import type { CourtMarker } from "../../../components/BasketballCourtSVG";
import { PDF_COLORS } from "../../theme/colors";
import { PlatformOS } from "../../../constants";
import { COACH_ASSISTANT_LOGO_MARGIN, isColorDark } from "../../utils/logoHelper";
import {
  COURT_SVG_WIDTH_PORTRAIT,
  COURT_SVG_HEIGHT_PORTRAIT,
  COURT_SVG_WIDTH_LANDSCAPE,
  COURT_SVG_HEIGHT_LANDSCAPE,
} from "../../../constants/courtConstants";
import { calculateEfficiencyFromDB, calculatePlusMinus } from "../../utils/statsCalculator";
import { AvatarService } from "../AvatarService";

interface Player {
  id: number;
  num: number;
  name: string;
  team: Team;
  photoUrl?: string;
  playingTimeSeconds?: number;
  isSubstitute?: boolean;
}

interface PDFSponsor {
  priority: 1 | 2 | 3 | 4 | 5 | 6;
  logo_url: string;
  logo_url_dark?: string | null;
  name: string;
  source: 'club' | 'platform' | 'fallback';
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
  clubLogoUrl?: string;
  courtBackgroundColor?: string;
  courtLineColor?: string;
  isHome?: boolean; // Whether my team is playing at home
  overtimePeriods?: number; // Number of overtime periods played
  myTeamHandicap?: number;
  opponentHandicap?: number;
  matchSponsors?: PDFSponsor[];
}

export class PDFExportService {
  private static sanitizeFileName(name: string): string {
    return name
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  private static formatDateFile(date: Date): string {
    const d = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    return d.replace(/\//g, "-");
  }

  /**
   * Prints HTML to a PDF file and renames it to the given file name.
   * expo-print's printToFileAsync doesn't support a `fileName` option,
   * so the generated file is moved to a properly named path afterward.
   */
  private static async printAndRename(
    html: string,
    fileName: string
  ): Promise<{ uri: string }> {
    const { uri } = await Print.printToFileAsync({ html });
    const renamedUri = `${FileSystem.cacheDirectory}${fileName}.pdf`;
    await FileSystem.moveAsync({ from: uri, to: renamedUri });
    return { uri: renamedUri };
  }

  /**
   * Generate App logo SVG with readable formatting
   */
  private static generateAppLogoSVG(
    ballColor: string = PDF_COLORS.logo.ball,
    ballBackgroundColor: string = PDF_COLORS.logo.ballBackground,
    transparentBackground: boolean = false
  ): string {
    const bgFill = transparentBackground
      ? "transparent"
      : PDF_COLORS.logo.background;
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
   * Load default Coach Assistant logo as base64
   */
  private static async loadDefaultLogo(): Promise<string | null> {
    try {
      // In React Native, we need to use Asset from expo-asset to load local images
      const { Asset } = require("expo-asset");

      // Use logo from centralized helper
      const asset = Asset.fromModule(COACH_ASSISTANT_LOGO_MARGIN);

      // Ensure the asset is downloaded/available locally
      await asset.downloadAsync();

      // Convert the local asset to base64
      const uri = asset.localUri || asset.uri;
      const response = await fetch(uri);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(`[PDF Export] Error loading default logo:`, error);
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
      clubLogoUrl,
      courtBackgroundColor = PDF_COLORS.court.background,
      courtLineColor = PDF_COLORS.court.line,
      isHome = true,
      overtimePeriods = 0,
      myTeamHandicap = 0,
      opponentHandicap = 0,
      matchSponsors = [],
    } = options;

    console.log("[PDF Export] 🚀 Début generateMatchPDF");
    console.log("[PDF Export] 📊 Nombre de joueurs reçus:", players.length);
    console.log(
      "[PDF Export] 👥 Liste des joueurs reçus:",
      players.map((p) => ({
        id: p.id,
        num: p.num,
        name: p.name,
        team: p.team,
      }))
    );
    console.log("[PDF Export] 🎬 Nombre d'actions:", actions.length);
    console.log("[PDF Export] 📌 trackOpponentStats:", trackOpponentStats);

    // Log quelques actions pour voir leur structure
    if (actions.length > 0) {
      console.log(
        "[PDF Export] 📝 Échantillon de 5 premières actions:",
        actions.slice(0, 5).map((a) => ({
          player_number: a.player_number,
          player: a.player,
          type: a.type,
          action_type: a.action_type,
          team: a.team,
          specification: a.specification,
          points: a.points,
        }))
      );
    }

    // Determine home and away teams based on isHome flag
    const homeTeamName = isHome ? myTeamName : opponentName;
    const awayTeamName = isHome ? opponentName : myTeamName;
    const homeTeamScore = isHome ? myTeamScore : opponentScore;
    const awayTeamScore = isHome ? opponentScore : myTeamScore;
    const homeTeamHandicap = isHome ? myTeamHandicap : opponentHandicap;
    const awayTeamHandicap = isHome ? opponentHandicap : myTeamHandicap;

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
    let clubLogoBase64: string | undefined = clubLogoUrl;
    if (clubLogoUrl && clubLogoUrl.startsWith("http")) {
      console.log(`[PDF Export] Converting club logo to base64`);
      const base64Logo = await this.imageUrlToBase64(clubLogoUrl);
      clubLogoBase64 = base64Logo || clubLogoUrl;
      console.log(
        `[PDF Export] Club logo conversion complete, has base64:`,
        !!base64Logo
      );
    } else if (!clubLogoUrl) {
      console.log(
        `[PDF Export] No club logo, using default Coach Assistant logo`
      );
      const defaultLogo = await this.loadDefaultLogo();
      clubLogoBase64 = defaultLogo || undefined;
      console.log(`[PDF Export] Default logo loaded:`, !!defaultLogo);
    } else {
      console.log(
        `[PDF Export] Club logo not converted (not http or undefined)`
      );
    }

    const totalPeriods = matchFormat === "2_halves" ? 2 : 4;
    const periodLabel = matchFormat === "2_halves" ? "MT" : "Q";
    const totalPeriodsPlayed = totalPeriods + overtimePeriods; // Include overtime periods

    // Calculate period scores (including overtime periods)
    const { periodScoresMyTeam, periodScoresOpponent } =
      this.calculatePeriodScores(actions, totalPeriodsPlayed);

    // Arrange period scores in home/away order
    const periodScoresHome = isHome ? periodScoresMyTeam : periodScoresOpponent;
    const periodScoresAway = isHome ? periodScoresOpponent : periodScoresMyTeam;

    // Calculate action-by-action evolution for chart
    const { evolutionMyTeam, evolutionOpponent, evolutionPeriods } =
      this.calculateActionByActionEvolution(actions, totalPeriodsPlayed, myTeamHandicap, opponentHandicap);

    // Calculate player stats - always include MY_TEAM, include OPPONENT only if tracking
    console.log(
      "[PDF Export] 🔍 Tous les joueurs reçus:",
      playersWithBase64Photos.map((p) => ({
        id: p.id,
        num: p.num,
        name: p.name,
        team: p.team,
        hasPhoto: !!p.photoUrl,
      }))
    );

    const playersMyTeam = playersWithBase64Photos.filter(
      (p) => p.team === Team.MY_TEAM
    );
    const playersOpponent = trackOpponentStats
      ? playersWithBase64Photos.filter((p) => p.team === Team.OPPONENT)
      : [];

    console.log(
      "[PDF Export] 👥 Joueurs MY_TEAM filtrés:",
      playersMyTeam.length
    );
    console.log(
      "[PDF Export] 👥 Joueurs OPPONENT filtrés:",
      playersOpponent.length
    );

    // Compute +/- for all players
    const allPlayersForPm = [...playersMyTeam, ...playersOpponent].map((p) => ({
      player_number: p.num,
      team: p.team as "MyTeam" | "Opponent",
      is_starter: !p.isSubstitute,
    }));
    const pmMap = calculatePlusMinus(actions, allPlayersForPm);

    const statsMyTeam = playersMyTeam.map((player) => {
      console.log(
        `[PDF Export] ⚡ Calcul stats pour joueur MY_TEAM - ID: ${player.id}, Num: ${player.num}, Nom: ${player.name}`
      );
      const stats = this.calculatePlayerStats(player.id, actions);
      stats.pm = pmMap.get(`${player.team}-${player.num}`) || 0;
      console.log(`[PDF Export] 📊 Stats calculées:`, stats);
      return {
        ...player,
        stats,
      };
    });

    const statsOpponent = playersOpponent.map((player) => {
      console.log(
        `[PDF Export] ⚡ Calcul stats pour joueur OPPONENT - ID: ${player.id}, Num: ${player.num}, Nom: ${player.name}`
      );
      const stats = this.calculatePlayerStats(player.id, actions);
      stats.pm = pmMap.get(`${player.team}-${player.num}`) || 0;
      console.log(`[PDF Export] 📊 Stats calculées:`, stats);
      return {
        ...player,
        stats,
      };
    });

    // Generate HTML
    const html = this.generateHTML({
      myTeamName,
      opponentName,
      myTeamScore,
      opponentScore,
      homeTeamName,
      awayTeamName,
      homeTeamScore,
      awayTeamScore,
      matchDate,
      periodLabel,
      totalPeriods,
      totalPeriodsPlayed,
      overtimePeriods,
      periodScoresMyTeam,
      periodScoresOpponent,
      periodScoresHome,
      periodScoresAway,
      evolutionMyTeam,
      evolutionOpponent,
      evolutionPeriods,
      statsMyTeam,
      statsOpponent,
      trackOpponentStats,
      watermark,
      clubLogoUrl: clubLogoBase64,
      courtBackgroundColor,
      courtLineColor,
      actions,
      players: playersWithBase64Photos,
      matchFormat,
      periodDuration: options.periodDuration,
      homeTeamHandicap,
      awayTeamHandicap,
      myTeamHandicap,
      opponentHandicap,
      matchSponsors,
    });

    // Generate PDF using expo-print
    const matchFileName = `${this.sanitizeFileName(homeTeamName)}_${this.sanitizeFileName(awayTeamName)}_all_stats_${this.formatDateFile(matchDate)}`;
    const { uri } = await this.printAndRename(html, matchFileName);

    // Share the PDF with platform-specific options
    if (await Sharing.isAvailableAsync()) {
      const sharingOptions: Record<string, any> = {};

      // iOS requires UTI and mimeType for proper file handling
      if (Platform.OS === PlatformOS.IOS) {
        sharingOptions.UTI = "com.adobe.pdf";
        sharingOptions.mimeType = "application/pdf";
      }
      // Android also benefits from mimeType specification
      else if (Platform.OS === PlatformOS.ANDROID) {
        sharingOptions.mimeType = "application/pdf";
      }

      await Sharing.shareAsync(uri, sharingOptions);
    }

    return uri;
  }

  /**
   * Calculate scores by period
   * Uses period_number field from actions to correctly group scores by period
   */
  private static calculatePeriodScores(actions: any[], totalPeriods: number) {
    const periodScoresMyTeam: number[] = Array(totalPeriods).fill(0);
    const periodScoresOpponent: number[] = Array(totalPeriods).fill(0);

    // Filter only scoring actions (made shots)
    const scoringActions = actions.filter((action) => {
      // Note: Actions from MatchDataService use 'type', database uses 'action_type'
      const actionType = (
        action.type ||
        action.action_type ||
        ""
      ).toLowerCase();
      const specification = (action.specification || "").toLowerCase();
      return (
        actionType === ActionType.SHOT &&
        specification === ShotSpecification.MADE
      );
    });

    // Group scores by period using period_number field
    scoringActions.forEach((action) => {
      const periodNumber = action.period_number;

      // Skip invalid period numbers or periods beyond totalPeriods
      if (!periodNumber || periodNumber < 1 || periodNumber > totalPeriods) {
        return;
      }

      const periodIndex = periodNumber - 1; // Convert to 0-based index
      const points = action.points || 0;
      const team = action.team;

      if (team === Team.MY_TEAM) {
        periodScoresMyTeam[periodIndex] += points;
      } else if (team === Team.OPPONENT) {
        periodScoresOpponent[periodIndex] += points;
      }
    });

    return { periodScoresMyTeam, periodScoresOpponent };
  }

  /**
   * Calculate action-by-action score evolution
   * Returns arrays of scores after each scoring action for both teams
   */
  private static calculateActionByActionEvolution(
    actions: any[],
    totalPeriods: number,
    myTeamHandicap: number = 0,
    opponentHandicap: number = 0
  ) {
    // Filter and sort scoring actions
    const scoringActions = actions
      .filter((action) => {
        // Note: Actions from MatchDataService use 'type', database uses 'action_type'
        const actionType = (
          action.type ||
          action.action_type ||
          ""
        ).toLowerCase();
        const specification = (action.specification || "").toLowerCase();
        return (
          actionType === ActionType.SHOT &&
          specification === ShotSpecification.MADE
        );
      })
      .sort((a, b) => {
        // Sort by period first, then by timestamp
        if (a.period_number !== b.period_number) {
          return a.period_number - b.period_number;
        }
        if (a.timestamp && b.timestamp) {
          return (
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        }
        return 0;
      });

    // Build evolution arrays - start with handicap values (or 0-0 if no handicap)
    const evolutionMyTeam: number[] = [myTeamHandicap];
    const evolutionOpponent: number[] = [opponentHandicap];
    const evolutionPeriods: number[] = [0]; // Period number for each point (0 = start)

    let currentMyTeam = myTeamHandicap;
    let currentOpponent = opponentHandicap;

    scoringActions.forEach((action) => {
      const points = action.points || 0;
      const team = action.team;

      // Update score based on team
      if (team === Team.MY_TEAM) {
        currentMyTeam += points;
      } else if (team === Team.OPPONENT) {
        currentOpponent += points;
      }

      // Add point to evolution
      evolutionMyTeam.push(currentMyTeam);
      evolutionOpponent.push(currentOpponent);
      evolutionPeriods.push(action.period_number || 1);
    });

    return { evolutionMyTeam, evolutionOpponent, evolutionPeriods };
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
  private static calculateShootingPercentage(
    made: number,
    attempts: number
  ): number {
    return attempts > 0 ? Math.round((made / attempts) * 100) : 0;
  }

  /**
   * Calculate individual player stats
   * Handles both database format (action_type, player_number) and app format (type, player)
   */
  private static calculatePlayerStats(playerId: number, actions: any[]) {
    console.log(
      `[PDF Export] 🎯 calculatePlayerStats appelé pour playerId: ${playerId}`
    );
    console.log(
      `[PDF Export] 📋 Nombre total d'actions à analyser: ${actions.length}`
    );

    // Filter actions for this player - handle both player_number (DB) and player (app) formats
    const playerActions = actions.filter((a) => {
      const playerNum = a.player_number || a.player;
      return playerNum === playerId;
    });

    console.log(
      `[PDF Export] ✅ Actions trouvées pour playerId ${playerId}: ${playerActions.length}`
    );
    if (playerActions.length > 0) {
      console.log(`[PDF Export] 📝 Première action du joueur ${playerId}:`, {
        player_number: playerActions[0].player_number,
        player: playerActions[0].player,
        type: playerActions[0].type,
        action_type: playerActions[0].action_type,
        specification: playerActions[0].specification,
        points: playerActions[0].points,
      });
    }

    // Helper function to normalize action type
    // Note: Actions from MatchDataService use 'type', database uses 'action_type'
    const normalizeActionType = (action: any): string => {
      return (action.type || action.action_type || "").toLowerCase();
    };

    // Helper function to normalize specification
    const normalizeSpecification = (action: any): string => {
      return (action.specification || "").toLowerCase();
    };

    // Shots
    const shots = playerActions.filter(
      (a) => normalizeActionType(a) === ActionType.SHOT
    );
    const madeShots = shots.filter(
      (a) => normalizeSpecification(a) === ShotSpecification.MADE
    );

    const onePtMade = madeShots.filter((a) => a.points === 1).length;
    const twoPtMade = madeShots.filter((a) => a.points === 2).length;
    const threePtMade = madeShots.filter((a) => a.points === 3).length;

    const onePtAttempts = shots.filter((a) => a.points === 1).length;
    const twoPtAttempts = shots.filter((a) => a.points === 2).length;
    const threePtAttempts = shots.filter((a) => a.points === 3).length;

    const totalPoints = onePtMade * 1 + twoPtMade * 2 + threePtMade * 3;

    // Rebounds
    const rebounds = playerActions.filter(
      (a) => normalizeActionType(a) === ActionType.REBOUND
    );
    const offRebounds = rebounds.filter(
      (a) => normalizeSpecification(a) === ReboundSpecification.OFFENSIVE
    ).length;
    const defRebounds = rebounds.filter(
      (a) => normalizeSpecification(a) === ReboundSpecification.DEFENSIVE
    ).length;

    // Fouls
    const fouls = playerActions.filter(
      (a) => normalizeActionType(a) === ActionType.FOUL
    );
    const personalFouls = fouls.filter(
      (a) => normalizeSpecification(a) === FoulSpecification.PERSONAL
    ).length;
    const technicalFouls = fouls.filter(
      (a) => normalizeSpecification(a) === FoulSpecification.TECHNICAL
    ).length;
    const penalityFouls = fouls.filter(
      (a) => normalizeSpecification(a) === FoulSpecification.PENALITY
    ).length;
    const disqualificationFouls = fouls.filter(
      (a) => normalizeSpecification(a) === FoulSpecification.DISQUALIFICATION
    ).length;

    // New stats
    const assists = playerActions.filter(
      (a) => normalizeActionType(a) === ActionType.ASSIST
    ).length;
    const steals = playerActions.filter(
      (a) => normalizeActionType(a) === ActionType.STEAL
    ).length;
    const blocks = playerActions.filter(
      (a) => normalizeActionType(a) === ActionType.BLOCK
    ).length;
    const turnovers = playerActions.filter(
      (a) => normalizeActionType(a) === ActionType.TURNOVER
    ).length;
    const foulsDrawn = playerActions.filter(
      (a) => normalizeActionType(a) === ActionType.FOUL_DRAWN
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
      fd: foulsDrawn,
      pm: 0,
    };
  }

  /**
   * Stats legend constant
   */
  private static readonly STATS_LEGEND = `MIN: Minutes jouées | PTS: Points | TIRS: Tirs totaux (marqués/tentés) | 2PTS: 2 points (marqués/tentés) | 3PTS: 3 points (marqués/tentés) | LF: Lancers francs (marqués/tentés)<br>
      REB: Rebonds totaux | RO: Rebonds offensifs | RD: Rebonds défensifs<br>
      AST: Passes décisives | INT: Interceptions | CTR: Contres | BP: Balles perdues | FT: Fautes totales | FP: Fautes provoquées | +/-: Différentiel de points sur le terrain | EVAL: Evaluation`;

  /**
   * Get playing time formatted as MM:SS from actual tracked time
   */
  private static getPlayingTime(playingTimeSeconds?: number): string {
    // Use actual playing time tracked during the match
    if (playingTimeSeconds !== undefined && playingTimeSeconds > 0) {
      const minutes = Math.floor(playingTimeSeconds / 60);
      const seconds = playingTimeSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
    // If no tracking data available, return 0:00
    return "0:00";
  }

  /**
   * Calculate team totals from individual player stats
   */
  private static calculateTeamTotals(stats: any[]) {
    const twopm = stats.reduce((sum, p) => sum + p.stats.twopm, 0);
    const twopa = stats.reduce((sum, p) => sum + p.stats.twopa, 0);
    const threepm = stats.reduce((sum, p) => sum + p.stats.threepm, 0);
    const threepa = stats.reduce((sum, p) => sum + p.stats.threepa, 0);
    const ftm = stats.reduce((sum, p) => sum + p.stats.ftm, 0);
    const fta = stats.reduce((sum, p) => sum + p.stats.fta, 0);
    const orb = stats.reduce((sum, p) => sum + p.stats.orb, 0);
    const drb = stats.reduce((sum, p) => sum + p.stats.drb, 0);
    const points = stats.reduce((sum, p) => sum + p.stats.points, 0);
    const ast = stats.reduce((sum, p) => sum + p.stats.ast, 0);
    const stl = stats.reduce((sum, p) => sum + p.stats.stl, 0);
    const blk = stats.reduce((sum, p) => sum + p.stats.blk, 0);
    const tov = stats.reduce((sum, p) => sum + p.stats.tov, 0);
    const fd = stats.reduce((sum, p) => sum + (p.stats.fd || 0), 0);
    const pm = stats.reduce((sum, p) => sum + (p.stats.pm || 0), 0);
    const fouls = stats.reduce(
      (sum, p) => sum + this.calculateTotalFouls(p.stats),
      0
    );

    const fgm = twopm + threepm;
    const fga = twopa + threepa;
    const trb = orb + drb;
    const eff = calculateEfficiencyFromDB({
      points,
      orb,
      drb,
      ast,
      stl,
      blk,
      twopa,
      twopm,
      threepa,
      threepm,
      fta,
      ftm,
      tov,
      fd,
    });

    return {
      points,
      twopm,
      twopa,
      threepm,
      threepa,
      ftm,
      fta,
      fgm,
      fga,
      orb,
      drb,
      trb,
      ast,
      stl,
      blk,
      tov,
      fouls,
      fd,
      pm,
      eff,
    };
  }

  /**
   * Generate team stats table HTML
   */
  private static generateTeamStatsTable(
    teamName: string,
    stats: any[],
    teamClass: "team-a" | "team-b",
    teamActions: any[] = [],
    handicap: number = 0
  ): string {
    if (stats.length === 0) return "";

    const normalizeActionType = (a: any) => (a.type || a.action_type || "").toLowerCase();
    const normalizeSpecification = (a: any) => (a.specification || "").toLowerCase();

    const teamReboundActions = teamActions.filter(
      (a) => (a.player_number ?? a.player) === -1 && normalizeActionType(a) === ActionType.REBOUND
    );
    const teamOrbCount = teamReboundActions.filter(
      (a) => normalizeSpecification(a) === ReboundSpecification.OFFENSIVE
    ).length;
    const teamDrbCount = teamReboundActions.filter(
      (a) => normalizeSpecification(a) === ReboundSpecification.DEFENSIVE
    ).length;
    const teamTrbCount = teamOrbCount + teamDrbCount;

    const totals = this.calculateTeamTotals(stats);
    const totalsWithTeamReb = {
      ...totals,
      orb: totals.orb + teamOrbCount,
      drb: totals.drb + teamDrbCount,
      trb: totals.trb + teamTrbCount,
    };

    return `
  <div class="stats-section ${teamClass}">
    <h2>${teamName} - Statistiques individuelles</h2>
    <table class="stats-table">
      <thead>
        <tr>
          <th class="player-number">#</th>
          <th class="player-name">Joueur</th>
          <th>MIN</th>
          <th>PTS</th>
          <th>TIRS</th>
          <th>2PTS</th>
          <th>3PTS</th>
          <th>LF</th>
          <th>REB</th>
          <th>RO</th>
          <th>RD</th>
          <th>AST</th>
          <th>INT</th>
          <th>CTR</th>
          <th>BP</th>
          <th>FT</th>
          <th>FP</th>
          <th>+/-</th>
          <th>EVAL</th>
        </tr>
      </thead>
      <tbody>
        ${stats
          .map((player) => {
            console.log(`[PDF Export] 🏀 Génération HTML pour joueur:`, {
              id: player.id,
              num: player.num,
              name: player.name,
              team: player.team,
              stats: player.stats,
            });

            const totalFouls = this.calculateTotalFouls(player.stats);
            const totalRebounds = player.stats.orb + player.stats.drb;
            const totalFgm = player.stats.twopm + player.stats.threepm;
            const totalFga = player.stats.twopa + player.stats.threepa;

            console.log(
              `[PDF Export] 🔢 Calcul EVAL pour ${player.name} (#${player.num}):`,
              {
                points: player.stats.points,
                rebounds: totalRebounds,
                ast: player.stats.ast,
                stl: player.stats.stl,
                blk: player.stats.blk,
                fgMissed:
                  player.stats.twopa -
                  player.stats.twopm +
                  (player.stats.threepa - player.stats.threepm),
                ftMissed: player.stats.fta - player.stats.ftm,
                tov: player.stats.tov,
              }
            );

            const efficiency = calculateEfficiencyFromDB(player.stats);
            console.log(`[PDF Export] ✅ EVAL calculée:`, efficiency);

            const playingTime = this.getPlayingTime(player.playingTimeSeconds);

            return `
        <tr>
          <td class="player-number">${player.num}</td>
          <td class="player-name">${player.name}${!player.isSubstitute ? ' ★' : ''}</td>
          <td>${playingTime}</td>
          <td><strong>${player.stats.points}</strong></td>
          <td>${totalFgm}/${totalFga}</td>
          <td>${player.stats.twopm}/${player.stats.twopa}</td>
          <td>${player.stats.threepm}/${player.stats.threepa}</td>
          <td>${player.stats.ftm}/${player.stats.fta}</td>
          <td>${totalRebounds}</td>
          <td>${player.stats.orb}</td>
          <td>${player.stats.drb}</td>
          <td>${player.stats.ast}</td>
          <td>${player.stats.stl}</td>
          <td>${player.stats.blk}</td>
          <td>${player.stats.tov}</td>
          <td>${totalFouls}</td>
          <td>${player.stats.fd}</td>
          <td><strong style="color:${player.stats.pm > 0 ? '#4CAF50' : player.stats.pm < 0 ? '#F44336' : 'inherit'}">${player.stats.pm > 0 ? '+' + player.stats.pm : player.stats.pm}</strong></td>
          <td><strong>${efficiency}</strong></td>
        </tr>
        `;
          })
          .join("")}
        ${(() => {
          const starters = stats.filter(p => !p.isSubstitute);
          const bench = stats.filter(p => p.isSubstitute);
          const subtotalRow = (label: string, tot: ReturnType<typeof PDFExportService.calculateTeamTotals>) => `
        <tr class="subtotal-row">
          <td colspan="2" style="text-align:left; font-style:italic; padding-left:8px;">${label}</td>
          <td>-</td>
          <td><strong>${tot.points}</strong></td>
          <td>${tot.fgm}/${tot.fga}</td>
          <td>${tot.twopm}/${tot.twopa}</td>
          <td>${tot.threepm}/${tot.threepa}</td>
          <td>${tot.ftm}/${tot.fta}</td>
          <td>${tot.trb}</td>
          <td>${tot.orb}</td>
          <td>${tot.drb}</td>
          <td>${tot.ast}</td>
          <td>${tot.stl}</td>
          <td>${tot.blk}</td>
          <td>${tot.tov}</td>
          <td>${tot.fouls}</td>
          <td>${tot.fd}</td>
          <td>${tot.pm > 0 ? '+' + tot.pm : tot.pm}</td>
          <td><strong>${tot.eff}</strong></td>
        </tr>`;
          return [
            starters.length > 0 ? subtotalRow('5 DÉPART', PDFExportService.calculateTeamTotals(starters)) : '',
            bench.length > 0 ? subtotalRow('BANC', PDFExportService.calculateTeamTotals(bench)) : '',
          ].join('');
        })()}
        ${teamTrbCount > 0 ? `
        <tr class="team-rebound-row">
          <td colspan="2" style="text-align:left; font-style:italic; padding-left:8px;">Rebonds d'équipe</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td>${teamTrbCount}</td>
          <td>${teamOrbCount}</td>
          <td>${teamDrbCount}</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
        </tr>` : ''}
        <tr class="totals-row">
          <td colspan="2">TOTAL${handicap > 0 ? ` <span class="hcp-badge">+${handicap} HCP</span>` : ''}</td>
          <td>-</td>
          <td><strong>${totalsWithTeamReb.points}</strong></td>
          <td>${totalsWithTeamReb.fgm}/${totalsWithTeamReb.fga}</td>
          <td>${totalsWithTeamReb.twopm}/${totalsWithTeamReb.twopa}</td>
          <td>${totalsWithTeamReb.threepm}/${totalsWithTeamReb.threepa}</td>
          <td>${totalsWithTeamReb.ftm}/${totalsWithTeamReb.fta}</td>
          <td>${totalsWithTeamReb.trb}</td>
          <td>${totalsWithTeamReb.orb}</td>
          <td>${totalsWithTeamReb.drb}</td>
          <td>${totalsWithTeamReb.ast}</td>
          <td>${totalsWithTeamReb.stl}</td>
          <td>${totalsWithTeamReb.blk}</td>
          <td>${totalsWithTeamReb.tov}</td>
          <td>${totalsWithTeamReb.fouls}</td>
          <td>${totalsWithTeamReb.fd}</td>
          <td>${totalsWithTeamReb.pm > 0 ? '+' + totalsWithTeamReb.pm : totalsWithTeamReb.pm}</td>
          <td><strong>${totalsWithTeamReb.eff}</strong></td>
        </tr>
      </tbody>
    </table>
    <div class="legend">
      ${this.STATS_LEGEND}${handicap > 0 ? `<br>HCP: Handicap de départ (+${handicap} pts inclus dans le score final)` : ''}
    </div>
  </div>
  `;
  }

  /**
   * Generate score evolution SVG chart with action-by-action evolution
   */
  private static generateScoreChart(
    evolutionMyTeam: number[],
    evolutionOpponent: number[],
    evolutionPeriods: number[],
    periodLabel: string,
    totalPeriodsPlayed: number,
    trackOpponentStats: boolean,
    myTeamName: string,
    opponentName: string,
    basePeriods?: number
  ): string {
    const width = 500;
    const height = 200;
    const padding = { top: 30, right: 30, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxScore = Math.max(
      ...evolutionMyTeam,
      ...evolutionOpponent,
      20 // Minimum scale
    );
    const yScale = chartHeight / maxScore;

    // Generate path for my team - action by action
    let pathMyTeam = "";
    evolutionMyTeam.forEach((score, i) => {
      // Calculate x position based on action index distributed across total periods
      const x =
        padding.left +
        (i / Math.max(evolutionMyTeam.length - 1, 1)) * chartWidth;
      const y = padding.top + chartHeight - score * yScale;

      if (i === 0) {
        pathMyTeam = `M ${x} ${y}`;
      } else {
        pathMyTeam += ` L ${x} ${y}`;
      }
    });

    // Generate path for opponent - action by action (always shown)
    let pathOpponent = "";
    evolutionOpponent.forEach((score, i) => {
      const x =
        padding.left +
        (i / Math.max(evolutionOpponent.length - 1, 1)) * chartWidth;
      const y = padding.top + chartHeight - score * yScale;

      if (i === 0) {
        pathOpponent = `M ${x} ${y}`;
      } else {
        pathOpponent += ` L ${x} ${y}`;
      }
    });

    // Generate X-axis labels with "FIN" above period labels
    const actualBasePeriods = basePeriods || totalPeriodsPlayed; // Default to totalPeriodsPlayed if basePeriods not provided
    const overtimes = totalPeriodsPlayed - actualBasePeriods;

    const xLabelsHTML = Array.from(
      { length: totalPeriodsPlayed + 1 },
      (_, i) => {
        const x = padding.left + (i * chartWidth) / totalPeriodsPlayed;
        if (i === 0) {
          return `<text x="${x}" y="${
            height - 10
          }" text-anchor="middle" font-size="10">Début</text>`;
        }

        // Determine label: regular period or OT
        let label;
        if (i <= actualBasePeriods) {
          label = `${periodLabel}${i}`;
        } else {
          const otNumber = i - actualBasePeriods;
          label = overtimes > 1 ? `OT${otNumber}` : "OT";
        }

        return `
        <text x="${x}" y="${
          height - 18
        }" text-anchor="middle" font-size="9">FIN</text>
        <text x="${x}" y="${
          height - 8
        }" text-anchor="middle" font-size="10" font-weight="bold">${label}</text>
      `;
      }
    ).join("");

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
          }" y2="${y}" stroke="${
            PDF_COLORS.chart.gridLine
          }" stroke-width="1"/>`;
        }).join("")}

        <!-- Axes -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${
      padding.left
    }" y2="${padding.top + chartHeight}" stroke="${
      PDF_COLORS.chart.axis
    }" stroke-width="2"/>
        <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${
      width - padding.right
    }" y2="${padding.top + chartHeight}" stroke="${
      PDF_COLORS.chart.axis
    }" stroke-width="2"/>

        <!-- My Team line (always shown with orange color) -->
        <path d="${pathMyTeam}" fill="none" stroke="${
      PDF_COLORS.chart.myTeam
    }" stroke-width="3"/>

        <!-- Opponent line (always shown with blue color) -->
        <path d="${pathOpponent}" fill="none" stroke="${
      PDF_COLORS.chart.opponent
    }" stroke-width="3"/>

        <!-- Labels -->
        ${xLabelsHTML}
        ${yLabelsHTML}

        <!-- Legend -->
        <circle cx="50" cy="15" r="4" fill="${PDF_COLORS.chart.myTeam}"/>
        <text x="58" y="18" font-size="10">${myTeamName}</text>

        <circle cx="150" cy="15" r="4" fill="${PDF_COLORS.chart.opponent}"/>
        <text x="158" y="18" font-size="10">${opponentName}</text>
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
    backgroundColor: string = PDF_COLORS.court.background,
    lineColor: string = PDF_COLORS.court.line,
    markers: CourtMarker[] = [],
    logoUrl?: string | null,
    sponsors?: PDFSponsor[]
  ): string {
    const isPortrait = height > width;
    const SVG_WIDTH = isPortrait
      ? COURT_SVG_WIDTH_PORTRAIT
      : COURT_SVG_WIDTH_LANDSCAPE;
    const SVG_HEIGHT = isPortrait
      ? COURT_SVG_HEIGHT_PORTRAIT
      : COURT_SVG_HEIGHT_LANDSCAPE;

    // Convert markers from portrait coordinates to current orientation
    const convertedMarkers = markers.map((marker) => {
      if (isPortrait) {
        return marker;
      }
      // Convert portrait → landscape: (x, y) → (y, COURT_SVG_WIDTH_PORTRAIT - x)
      return {
        ...marker,
        svgX: marker.svgY,
        svgY: COURT_SVG_WIDTH_PORTRAIT - marker.svgX,
      };
    });

    const renderMarkers = convertedMarkers
      .map((marker) => {
        const pos = { x: marker.svgX, y: marker.svgY };
        const color = marker.color || PDF_COLORS.court.markerDefault;
        return renderMarkerSVG(
          pos,
          color,
          marker.actionType,
          marker.specification,
          8
        );
      })
      .join("");

    // Logo clipPath definitions (to be added to <defs>)
    const logoClipPath = logoUrl
      ? isPortrait
        ? `<clipPath id="logoClipPortrait"><circle cx="307" cy="573" r="76" /></clipPath>`
        : `<clipPath id="logoClipLandscape"><circle cx="573" cy="307" r="76" /></clipPath>`
      : "";

    // On-court sponsor zones 1-4 (same coordinates as BasketballCourtSVG component)
    const dark = isColorDark(backgroundColor);
    const pick = (s: PDFSponsor) => dark && s.logo_url_dark ? s.logo_url_dark : s.logo_url;
    const onCourtSponsors = (sponsors || []).filter(s => s.priority >= 1 && s.priority <= 4);

    const renderCourtSponsors = (() => {
      if (onCourtSponsors.length === 0) return '';
      const w = 250; const h = 110;
      const sideMargin = 20; const centerMargin = 10;

      if (isPortrait) {
        const centerY = 572.812;
        const cx1 = COURT_SVG_WIDTH_PORTRAIT - sideMargin - h / 2;
        const cy1 = centerY - centerMargin - w / 2;
        const cx2 = sideMargin + h / 2;
        const cy2 = centerY + centerMargin + w / 2;
        const cx3 = cx2; const cy3 = cy1;
        const cx4 = cx1; const cy4 = cy2;
        const zone = (s: PDFSponsor | undefined, cx: number, cy: number, rot: number) =>
          s ? `<g transform="rotate(${rot},${cx},${cy})"><image href="${pick(s)}" x="${cx - w/2}" y="${cy - h/2}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" /></g>` : '';
        return [
          zone(onCourtSponsors.find(s => s.priority === 1), cx1, cy1, 90),
          zone(onCourtSponsors.find(s => s.priority === 2), cx2, cy2, -90),
          zone(onCourtSponsors.find(s => s.priority === 3), cx3, cy3, -90),
          zone(onCourtSponsors.find(s => s.priority === 4), cx4, cy4, 90),
        ].join('');
      } else {
        const centerX = 572.812;
        const x1 = centerX - centerMargin - w; const y1 = sideMargin;
        const x2 = centerX + centerMargin;     const y2 = COURT_SVG_HEIGHT_LANDSCAPE - sideMargin - h;
        const x3 = x2;                         const y3 = sideMargin;
        const x4 = x1;                         const y4 = y2;
        const zone = (s: PDFSponsor | undefined, x: number, y: number) =>
          s ? `<image href="${pick(s)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" />` : '';
        return [
          zone(onCourtSponsors.find(s => s.priority === 1), x1, y1),
          zone(onCourtSponsors.find(s => s.priority === 2), x2, y2),
          zone(onCourtSponsors.find(s => s.priority === 3), x3, y3),
          zone(onCourtSponsors.find(s => s.priority === 4), x4, y4),
        ].join('');
      }
    })();

    // Center logo - use club logo if provided, otherwise display app logo
    const renderCenterLogo = isPortrait
      ? logoUrl
        ? `
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
        href="${this.generateAppLogoSVG()}"
        x="245"
        y="511"
        width="124"
        height="124"
        preserveAspectRatio="xMidYMid meet"
      />
    `
      : logoUrl
      ? `
      <image
        href="${logoUrl}"
        x="497"
        y="231"
        width="152"
        height="152"
        preserveAspectRatio="xMidYMid slice"
        clip-path="url(#logoClipLandscape)"
      />
    `
      : `
      <!-- App logo when no club logo - sized to fit inside circle radius 76 -->
      <image
        href="${this.generateAppLogoSVG()}"
        x="511"
        y="245"
        width="124"
        height="124"
        preserveAspectRatio="xMidYMid meet"
      />
    `;

    const courtBackgroundPath = isPortrait
      ? `M0 0h${COURT_SVG_WIDTH_PORTRAIT}v${COURT_SVG_HEIGHT_PORTRAIT}H0z`
      : `M0 0h${COURT_SVG_WIDTH_LANDSCAPE}v${COURT_SVG_HEIGHT_LANDSCAPE}H0z`;

    if (isPortrait) {
      return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <!-- Court background -->
        <path fill="${backgroundColor}" d="${courtBackgroundPath}" />

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
          ${logoClipPath}
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

        <!-- Sponsor zones 1-4 (under center logo) -->
        ${renderCourtSponsors}

        <!-- Render center court logo first (behind markers) -->
        ${renderCenterLogo}

        <!-- Render markers on top of logo -->
        ${renderMarkers}
      </svg>
    `;
    } else {
      // Landscape orientation
      return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <!-- Court background -->
        <path fill="${backgroundColor}" d="${courtBackgroundPath}" />

        <defs>
          <clipPath id="a"><path d="M.434.164H1145.84v614.75H.434zm0 0" /></clipPath>
          <clipPath id="b"><path d="M805 37.32h340.836v540.27H805zm0 0" /></clipPath>
          <clipPath id="c"><path d="M820.621 217.508c-9.422 27.699-15.601 59.187-15.601 90.094 0 30.906 5.296 60.644 14.718 88.05.293.586.293 1.168.586 1.75 37.68 102.922 137.172 178.73 246.242 180.188h79.27V37.32h-79.211c-109.719 1.457-209.21 76.098-246.004 180.188zm0 0" /></clipPath>
          <clipPath id="d"><path d="M905.191 207.516h240.645V407.39H905.19zm0 0" /></clipPath>
          <clipPath id="e"><path d="M905.188 232.645h240.648v149.937H905.187zm0 0" /></clipPath>
          <clipPath id="f"><path d="M497.613 231.934h151.043v151.043H497.613zm0 0" /></clipPath>
          <clipPath id="g"><path d="M573.137 382.977c41.707 0 75.52-33.813 75.52-75.524 0-41.707-33.813-75.52-75.52-75.52-41.711 0-75.524 33.813-75.524 75.52 0 41.711 33.813 75.524 75.524 75.524zm0 0" /></clipPath>
          <clipPath id="i"><path d="M.613.934h151.043v151.043H.613zm0 0" /></clipPath>
          <clipPath id="j"><path d="M76.137 151.977c41.707 0 75.52-33.813 75.52-75.524 0-41.707-33.813-75.52-75.52-75.52C34.426.934.613 34.747.613 76.454c0 41.711 33.813 75.524 75.524 75.524zm0 0" /></clipPath>
          <clipPath id="h"><path d="M0 0H152V152H0z" /></clipPath>
          <clipPath id="k"><path d="M497.969 232.29h150.687v150.687H497.97zm0 0" /></clipPath>
          <clipPath id="l"><path d="M573.137 382.977c41.71 0 75.52-33.813 75.52-75.52 0-41.71-33.81-75.52-75.52-75.52-41.707 0-75.52 33.81-75.52 75.52 0 41.707 33.813 75.52 75.52 75.52zm0 0" /></clipPath>
          <clipPath id="m"><path d="M570 380h6v235.5h-6zm0 0" /></clipPath>
          <clipPath id="n"><path d="M1028.402 255.773h68.97V359.23h-68.97zm0 0" /></clipPath>
          <clipPath id="o"><path d="M1031.39 324.695c-1.804-5.289-2.988-11.343-2.988-17.265a51.97 51.97 0 012.82-16.88c.06-.109.06-.222.114-.335 7.223-19.727 26.289-34.254 47.273-34.535h18.528v103.55h-18.516c-21.105-.277-40.176-14.582-47.23-34.535zm0 0" /></clipPath>
          <clipPath id="p"><path d="M1084.234 260.375h21.375v94.168h-21.375zm0 0" /></clipPath>
          <clipPath id="r"><path d="M.234.375H21.61v94.168H.234zm0 0" /></clipPath>
          <clipPath id="q"><path d="M0 0H22V95H0z" /></clipPath>
          <clipPath id="s"><path d="M1070.723 298.188h18.742v18.742h-18.742zm0 0" /></clipPath>
          <clipPath id="t"><path d="M1079.988 316.93c5.235 0 9.477-4.246 9.477-9.477a9.476 9.476 0 00-9.477-9.476 9.476 9.476 0 00-9.476 9.476c0 5.23 4.242 9.477 9.476 9.477zm0 0" /></clipPath>
          <clipPath id="u"><path d="M834.66 232.645h74.969v149.937H834.66zm0 0" /></clipPath>
          <clipPath id="v"><path d="M839 332.473c-2.621-7.68-4.34-16.461-4.34-25.059a75.353 75.353 0 014.094-24.488c.082-.16.082-.324.164-.485 10.477-28.625 38.148-49.707 68.047-50.113h2.898v150.254h-2.898c-30.063-.406-57.735-21.164-67.965-50.11zm0 0" /></clipPath>
          <clipPath id="w"><path d="M834.73 232.645h149.938v149.937H834.73zm0 0" /></clipPath>
          <clipPath id="x"><path d="M909.664 382.582c41.426 0 75.004-33.637 75.004-75.129 0-41.488-33.578-75.125-75.004-75.125-41.422 0-75 33.637-75 75.125 0 41.492 33.578 75.129 75 75.129zm0 0" /></clipPath>
          <clipPath id="y"><path d="M.11 37.32H341v540.274H.11zm0 0" /></clipPath>
          <clipPath id="z"><path d="M325.328 397.406c9.418-27.699 15.598-59.187 15.598-90.094 0-30.906-5.297-60.648-14.715-88.054-.297-.582-.297-1.164-.59-1.75C287.941 114.586 188.45 38.778 79.38 37.32H.109v540.274H79.32c109.72-1.457 209.211-76.098 246.008-180.188zm0 0" /></clipPath>
          <clipPath id="A"><path d="M.11 207.52h240.648v199.878H.109zm0 0" /></clipPath>
          <clipPath id="B"><path d="M.11 232.328h240.648V382.27H.109zm0 0" /></clipPath>
          <clipPath id="C"><path d="M48.574 255.68h68.969v103.457H48.574zm0 0" /></clipPath>
          <clipPath id="D"><path d="M114.555 290.215c1.804 5.293 2.988 11.344 2.988 17.27a51.947 51.947 0 01-2.82 16.874c-.055.114-.055.227-.114.336-7.218 19.727-26.289 34.258-47.27 34.535H48.814V255.68h18.511c21.11.28 40.176 14.586 47.23 34.535zm0 0" /></clipPath>
          <clipPath id="E"><path d="M40.34 260.367h21.37v94.172H40.34zm0 0" /></clipPath>
          <clipPath id="G"><path d="M.34.367h21.37V94.54H.34zm0 0" /></clipPath>
          <clipPath id="F"><path d="M0 0H22V95H0z" /></clipPath>
          <clipPath id="H"><path d="M56.48 297.984h18.743v18.743H56.48zm0 0" /></clipPath>
          <clipPath id="I"><path d="M65.957 297.984a9.476 9.476 0 00-9.477 9.477 9.476 9.476 0 009.477 9.476 9.476 9.476 0 009.477-9.476 9.476 9.476 0 00-9.477-9.477zm0 0" /></clipPath>
          <clipPath id="J"><path d="M236.316 232.328h74.97V382.27h-74.97zm0 0" /></clipPath>
          <clipPath id="K"><path d="M306.95 282.441c2.616 7.68 4.335 16.461 4.335 25.055a75.318 75.318 0 01-4.094 24.488c-.082.164-.082.325-.164.489-10.476 28.62-38.144 49.707-68.043 50.109h-2.902V232.328h2.898c30.063.406 57.735 21.164 67.97 50.113zm0 0" /></clipPath>
          <clipPath id="L"><path d="M161.277 232.328h149.938V382.27H161.277zm0 0" /></clipPath>
          <clipPath id="M"><path d="M236.281 232.328c-41.422 0-75.004 33.637-75.004 75.129 0 41.492 33.582 75.129 75.004 75.129 41.422 0 75-33.637 75-75.129 0-41.492-33.578-75.129-75-75.129zm0 0" /></clipPath>
          ${logoClipPath}
        </defs>

        <g clip-path="url(#a)"><path fill="none" d="M1145.84 614.914H.433V0H1145.84zm0 0" stroke="${lineColor}" stroke-width="14.994"/></g>
        <g clip-path="url(#b)"><g clip-path="url(#c)"><path fill="none" d="M820.62 217.508c-9.421 27.7-15.6 59.187-15.6 90.094 0 30.906 5.296 60.644 14.718 88.05.293.586.293 1.169.586 1.75 37.68 102.922 137.172 178.731 246.242 180.188h79.27V37.32h-79.211c-109.719 1.457-209.211 76.098-246.004 180.188zm0 0" stroke="${lineColor}" stroke-width="8.996"/></g></g>
        <g clip-path="url(#d)"><path fill="none" d="M1145.836 407.39H905.19V207.517h240.645zm0 0" stroke="${lineColor}" stroke-width="8.996"/></g>
        <g clip-path="url(#e)"><path fill="none" d="M1145.836 382.582H905.187V232.328h240.649zm0 0" stroke="${lineColor}" stroke-width="8.996"/></g>
        <g clip-path="url(#f)"><g clip-path="url(#g)"><g clip-path="url(#h)" transform="translate(497 231)"><g clip-path="url(#i)"><g clip-path="url(#j)"><path fill="${backgroundColor}" d="M151.656 151.977H.613V.934h151.043zm0 0"/></g></g></g></g></g>
        <g clip-path="url(#k)"><g clip-path="url(#l)"><path fill="none" d="M573.137 382.977c41.71 0 75.52-33.813 75.52-75.52 0-41.711-33.81-75.52-75.52-75.52-41.707 0-75.52 33.809-75.52 75.52 0 41.707 33.813 75.52 75.52 75.52zm0 0" stroke="${lineColor}" stroke-width="8.996"/></g></g>
        <path fill="none" d="M573.133 231.93V-.004" stroke="${lineColor}" stroke-width="4.498"/>
        <g clip-path="url(#m)"><path fill="none" d="M573.133 614.91V382.973" stroke="${lineColor}" stroke-width="4.498"/></g>
        <g clip-path="url(#n)"><g clip-path="url(#o)"><path fill="none" d="M1031.39 324.695c-1.804-5.289-2.988-11.343-2.988-17.265a51.97 51.97 0 012.82-16.88c.06-.109.06-.222.114-.335 7.223-19.727 26.289-34.254 47.273-34.535h18.528v103.55h-18.516c-21.105-.277-40.176-14.582-47.23-34.535zm0 0" stroke="${lineColor}" stroke-width="8.996"/></g></g>
        <g clip-path="url(#p)"><g clip-path="url(#q)" transform="translate(1084 260)"><g clip-path="url(#r)"><path fill="${backgroundColor}" d="M21.61 94.543H.233V.371H21.61zm0 0"/></g></g></g>
        <g clip-path="url(#s)"><g clip-path="url(#t)"><path fill="none" d="M1079.988 316.93c5.235 0 9.477-4.246 9.477-9.477a9.476 9.476 0 00-9.477-9.476 9.476 9.476 0 00-9.476 9.476c0 5.23 4.242 9.477 9.476 9.477zm0 0" stroke="${lineColor}" stroke-width="8.996"/></g></g>
        <path fill="none" d="M1089.477 307.457h11.03" stroke="${lineColor}" stroke-width="4.498"/>
        <path fill="none" d="M1097.137 343.64v-72.378" stroke="${lineColor}" stroke-width="6.747"/>
        <g clip-path="url(#u)"><g clip-path="url(#v)"><path fill="none" d="M839 332.473c-2.621-7.68-4.34-16.461-4.34-25.059a75.353 75.353 0 014.094-24.488c.082-.16.082-.324.164-.485 10.477-28.625 38.148-49.707 68.047-50.113h2.898v150.254h-2.898c-30.063-.406-57.735-21.164-67.965-50.11zm0 0" stroke="${lineColor}" stroke-width="8.996"/></g></g>
        <g clip-path="url(#w)"><g clip-path="url(#x)"><path fill="${lineColor}" d="M926.438 376.074a69.797 69.797 0 0011.976-4.105l3.676 8.207a78.424 78.424 0 01-13.516 4.637zm15.78-5.949a70.878 70.878 0 0010.665-6.86l5.527 7.098a79.767 79.767 0 01-12.027 7.735zm13.927-9.563a70.963 70.963 0 008.742-9.187l7.047 5.594a80.115 80.115 0 01-9.848 10.351zm11.277-12.585a70.673 70.673 0 006.308-10.989l8.172 3.758a79.415 79.415 0 01-7.113 12.39zm7.96-14.883a70.047 70.047 0 003.509-12.172l8.836 1.7a79.099 79.099 0 01-3.961 13.733zm4.184-16.344c.403-3.074.602-6.172.602-9.297a70.95 70.95 0 00-.078-3.41l8.984-.426a78.44 78.44 0 01.094 3.836c0 3.516-.23 7.008-.684 10.469zm.2-16.91a70.592 70.592 0 00-2.473-12.43l8.629-2.543a79.289 79.289 0 012.789 14.016zm-3.793-16.45a70.495 70.495 0 00-5.364-11.476l7.774-4.527a79.426 79.426 0 016.05 12.941zm-7.602-15.062a70.617 70.617 0 00-7.95-9.894l6.481-6.239a79.555 79.555 0 018.961 11.149zm-10.973-12.855a70.608 70.608 0 00-10.062-7.73l4.82-7.598a79.79 79.79 0 0111.34 8.714zm-13.699-9.891a70.2 70.2 0 00-11.59-5.105l2.868-8.528a79.22 79.22 0 0113.078 5.762zm-15.629-6.328a70.15 70.15 0 00-12.48-2.184l.746-8.965a78.976 78.976 0 0114.078 2.465zm-16.703-2.41a71.022 71.022 0 00-12.684.832l-1.39-8.887a79.684 79.684 0 0114.285-.937zm-16.828 1.61a69.602 69.602 0 00-12.074 3.82l-3.477-8.297a78.55 78.55 0 0113.625-4.313zm-15.926 5.573a70.434 70.434 0 00-10.82 6.598l-5.356-7.23a79.518 79.518 0 0112.204-7.442zm-14.148 9.22a70.71 70.71 0 00-8.953 8.98l-6.914-5.758a79.896 79.896 0 0110.09-10.117zm-11.567 12.315a70.295 70.295 0 00-6.574 10.84l-8.082-3.957a79.671 79.671 0 017.41-12.218zm-8.32 14.696a70.063 70.063 0 00-3.8 12.082l-8.79-1.914a78.945 78.945 0 014.285-13.63zm-4.574 16.23a71.263 71.263 0 00-.82 12.688l-8.996.215a79.897 79.897 0 01.93-14.285zm-.598 16.91a70.124 70.124 0 002.18 12.485l-8.688 2.34a79.314 79.314 0 01-2.457-14.078zm3.399 16.532a70.19 70.19 0 005.086 11.597l-7.88 4.34a79.154 79.154 0 01-5.738-13.082zm7.238 15.242a70.832 70.832 0 007.71 10.078l-6.624 6.082a79.768 79.768 0 01-8.692-11.355zm10.664 13.11a70.9 70.9 0 009.879 7.968l-5 7.48a79.811 79.811 0 01-11.133-8.984zm13.461 10.21a69.936 69.936 0 0011.46 5.383l-3.07 8.457a79.134 79.134 0 01-12.933-6.074zm15.48 6.707c4.059 1.2 8.2 2.028 12.426 2.48l-.96 8.946a79.074 79.074 0 01-14.02-2.8zm16.63 2.805a70.757 70.757 0 0016.027-1.05l1.601 8.85a79.54 79.54 0 01-14.242 1.278 82.64 82.64 0 01-3.812-.09zm0 0"/></g></g>
        <g clip-path="url(#y)"><g clip-path="url(#z)"><path fill="none" d="M325.328 397.406c9.418-27.7 15.598-59.187 15.598-90.094 0-30.906-5.297-60.648-14.719-88.054-.293-.582-.293-1.164-.586-1.75C287.941 114.586 188.45 38.777 79.38 37.32H.109v540.274H79.32c109.72-1.457 209.211-76.098 246.008-180.188zm0 0" stroke="${lineColor}" stroke-width="8.996"/></g></g>
        <g clip-path="url(#A)"><path fill="none" d="M.11 207.52h240.648v199.879H.109zm0 0" stroke="${lineColor}" stroke-width="8.996"/></g>
        <g clip-path="url(#B)"><path fill="none" d="M.11 232.328h240.648v150.258H.109zm0 0" stroke="${lineColor}" stroke-width="8.996"/></g>
        <g clip-path="url(#C)"><g clip-path="url(#D)"><path fill="none" d="M114.555 290.215c1.804 5.293 2.988 11.344 2.988 17.27a51.947 51.947 0 01-2.82 16.874c-.055.114-.055.227-.114.336-7.218 19.727-26.289 34.258-47.27 34.536H48.813V255.68h18.512c21.11.28 40.176 14.586 47.23 34.535zm0 0" stroke="${lineColor}" stroke-width="8.996"/></g></g>
        <g clip-path="url(#E)"><g clip-path="url(#F)" transform="translate(40 260)"><g clip-path="url(#G)"><path fill="${backgroundColor}" d="M.34.367h21.37v94.176H.34zm0 0"/></g></g></g>
        <g clip-path="url(#H)"><g clip-path="url(#I)"><path fill="none" d="M65.957 297.984a9.476 9.476 0 00-9.477 9.477 9.476 9.476 0 009.477 9.477 9.476 9.476 0 009.477-9.477 9.476 9.476 0 00-9.477-9.477zm0 0" stroke="${lineColor}" stroke-width="8.996"/></g></g>
        <path fill="none" d="M56.469 307.453H45.44" stroke="${lineColor}" stroke-width="4.498"/>
        <path fill="none" d="M48.809 271.27v72.382" stroke="${lineColor}" stroke-width="6.747"/>
        <g clip-path="url(#J)"><g clip-path="url(#K)"><path fill="none" d="M306.95 282.441c2.616 7.68 4.335 16.461 4.335 25.055a75.318 75.318 0 01-4.094 24.488c-.082.164-.082.325-.164.489-10.476 28.62-38.144 49.707-68.043 50.11h-2.902V232.327h2.898c30.063.406 57.735 21.164 67.97 50.113zm0 0" stroke="${lineColor}" stroke-width="8.996"/></g></g>
        <g clip-path="url(#L)"><g clip-path="url(#M)"><path fill="${lineColor}" d="M219.508 238.836a69.926 69.926 0 00-11.977 4.11l-3.676-8.212a78.757 78.757 0 0113.516-4.636zm-15.778 5.953a70.415 70.415 0 00-10.667 6.86l-5.524-7.098a79.126 79.126 0 0112.024-7.735zm-13.93 9.559a70.952 70.952 0 00-8.738 9.191l-7.046-5.594a80.116 80.116 0 019.843-10.355zm-11.273 12.59a70.204 70.204 0 00-6.312 10.988l-8.172-3.762a79.415 79.415 0 017.113-12.39zm-7.96 14.878a70.1 70.1 0 00-3.512 12.176l-8.832-1.703a78.746 78.746 0 013.957-13.734zm-4.184 16.344a70.87 70.87 0 00-.606 9.297c0 1.14.028 2.277.078 3.41l-8.984.426a78.324 78.324 0 01-.09-3.836c0-3.516.227-7.004.68-10.465zm-.203 16.91a70.29 70.29 0 002.476 12.434l-8.629 2.543a79.41 79.41 0 01-2.793-14.02zm3.793 16.453a70.301 70.301 0 005.367 11.473l-7.778 4.527a79.273 79.273 0 01-6.05-12.941zm7.601 15.063c2.352 3.531 5 6.832 7.95 9.894l-6.481 6.239a79.754 79.754 0 01-8.957-11.149zm10.973 12.851a70.635 70.635 0 0010.062 7.735l-4.82 7.594a79.477 79.477 0 01-11.34-8.711zm13.7 9.891a69.874 69.874 0 0011.589 5.106l-2.867 8.527a79.203 79.203 0 01-13.078-5.758zm15.632 6.328a69.696 69.696 0 0012.476 2.184l-.746 8.969a79.328 79.328 0 01-14.078-2.465zm16.703 2.41a70.504 70.504 0 0012.68-.832l1.39 8.891a80.164 80.164 0 01-12.37.957c-.641 0-1.278-.008-1.915-.02zm16.824-1.609a69.589 69.589 0 0012.074-3.816l3.48 8.296a79.023 79.023 0 01-13.628 4.31zm15.926-5.57a70.434 70.434 0 0010.82-6.598l5.356 7.227a79.026 79.026 0 01-12.203 7.441zm14.148-9.223a70.741 70.741 0 008.957-8.98l6.91 5.761a80.154 80.154 0 01-10.09 10.118zm11.57-12.312a70.669 70.669 0 006.575-10.84l8.078 3.953a79.52 79.52 0 01-7.41 12.223zm8.317-14.696a69.997 69.997 0 003.801-12.086l8.789 1.914a78.88 78.88 0 01-4.285 13.633zm4.574-16.23a71.351 71.351 0 00.825-12.688l8.992-.215a79.86 79.86 0 01-.93 14.281zm.598-16.914a70.532 70.532 0 00-2.176-12.485l8.688-2.336a79.662 79.662 0 012.453 14.079zm-3.398-16.528a70.047 70.047 0 00-5.086-11.597l7.879-4.34a79.01 79.01 0 015.738 13.082zm-7.239-15.242a70.394 70.394 0 00-7.71-10.078l6.628-6.086a79.997 79.997 0 018.688 11.36zm-10.664-13.11a70.306 70.306 0 00-9.875-7.968l5-7.48a79.978 79.978 0 0111.13 8.98zm-13.46-10.214a70.088 70.088 0 00-11.462-5.379l3.07-8.457a78.662 78.662 0 0112.934 6.074zm-15.481-6.703a69.803 69.803 0 00-12.426-2.485l.961-8.94a78.382 78.382 0 0114.02 2.8zm-16.625-2.809a75.4 75.4 0 00-3.39-.078c-4.266 0-8.481.375-12.637 1.129l-1.606-8.852a79.93 79.93 0 0114.242-1.273c1.274 0 2.547.031 3.817.09zm0 0"/></g></g>

        <!-- Sponsor zones 1-4 (under center logo) -->
        ${renderCourtSponsors}

        <!-- Render center court logo first (behind markers) -->
        ${renderCenterLogo}

        <!-- Render markers on top of logo -->
        ${renderMarkers}
      </svg>
    `;
    }
  }

  /**
   * Generate SVG court for player shots using the full court component
   */
  private static generatePlayerShotCourt(
    actions: any[],
    playerId: number,
    backgroundColor: string = PDF_COLORS.court.background,
    lineColor: string = PDF_COLORS.court.line,
    logoUrl?: string | null,
    sponsors?: PDFSponsor[]
  ): string {
    const width = 465;
    const height = 250;
    const shotActions = actions.filter(
      (a) => a.type === ActionType.SHOT && a.player === playerId
    );

    if (shotActions.length === 0) {
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="125" y="232" text-anchor="middle" font-size="14" fill="${PDF_COLORS.court.noData}">Aucun tir</text></svg>`;
    }

    const markers: CourtMarker[] = shotActions.map((action, index) => {
      return {
        id: `shot-${index}`,
        svgX: action.semanticPosition.xNormalized * COURT_SVG_WIDTH_PORTRAIT,
        svgY: action.semanticPosition.yNormalized * COURT_SVG_HEIGHT_PORTRAIT,
        color: getActionColor(action.type, action.specification, action.points),
        actionType: action.type,
        specification: action.specification,
      };
    });

    return this.generateBasketballCourtSVG(
      width,
      height,
      backgroundColor,
      lineColor,
      markers,
      logoUrl,
      sponsors
    );
  }

  /**
   * Generate SVG court for player actions (non-shots) using the full court component
   */
  private static generatePlayerActionCourt(
    actions: any[],
    playerId: number,
    backgroundColor: string = PDF_COLORS.court.background,
    lineColor: string = PDF_COLORS.court.line,
    logoUrl?: string | null,
    sponsors?: PDFSponsor[]
  ): string {
    const width = 465;
    const height = 250;
    const nonShotActions = actions.filter(
      (a) => a.player === playerId && a.type !== ActionType.SHOT
    );

    if (nonShotActions.length === 0) {
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="125" y="232" text-anchor="middle" font-size="14" fill="${PDF_COLORS.court.noData}">Aucune action</text></svg>`;
    }

    const markers: CourtMarker[] = nonShotActions.map((action, index) => {
      return {
        id: `action-${index}`,
        svgX:
          (action.semanticPosition?.xNormalized || 0.5) *
          COURT_SVG_WIDTH_PORTRAIT,
        svgY:
          (action.semanticPosition?.yNormalized || 0.5) *
          COURT_SVG_HEIGHT_PORTRAIT,
        color: getActionColor(action.type, action.specification, action.points),
        actionType: action.type,
        specification: action.specification,
      };
    });

    return this.generateBasketballCourtSVG(
      width,
      height,
      backgroundColor,
      lineColor,
      markers,
      logoUrl,
      sponsors
    );
  }

  /**
   * Generate SVG court for ALL player actions (shots + other actions) using the full court component
   */
  private static generatePlayerAllActionsCourt(
    actions: any[],
    playerId: number,
    backgroundColor: string = PDF_COLORS.court.background,
    lineColor: string = PDF_COLORS.court.line,
    logoUrl?: string | null,
    sponsors?: PDFSponsor[]
  ): string {
    const width = 465;
    const height = 250;
    const playerActions = actions.filter((a) => a.player === playerId);

    if (playerActions.length === 0) {
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="125" y="232" text-anchor="middle" font-size="14" fill="${PDF_COLORS.court.noData}">Aucune action</text></svg>`;
    }

    const markers: CourtMarker[] = playerActions.map((action, index) => {
      return {
        id: `action-${index}`,
        svgX:
          (action.semanticPosition?.xNormalized || 0.5) *
          COURT_SVG_WIDTH_PORTRAIT,
        svgY:
          (action.semanticPosition?.yNormalized || 0.5) *
          COURT_SVG_HEIGHT_PORTRAIT,
        color: getActionColor(action.type, action.specification, action.points),
        actionType: action.type,
        specification: action.specification,
      };
    });

    return this.generateBasketballCourtSVG(
      width,
      height,
      backgroundColor,
      lineColor,
      markers,
      logoUrl,
      sponsors
    );
  }

  // Wraps a court SVG string in a div with rotated side-banner <img> for zones 5-6.
  private static wrapCourtWithSideBanners(
    svgString: string,
    sponsors: PDFSponsor[] | undefined,
    backgroundColor: string,
    courtHeight: number = 250
  ): string {
    const dark = isColorDark(backgroundColor);
    const pick = (s: PDFSponsor) => dark && s.logo_url_dark ? s.logo_url_dark : s.logo_url;
    const left  = sponsors?.find(s => s.priority === 5);
    const right = sponsors?.find(s => s.priority === 6);
    if (!left && !right) return svgString;

    const bannerH  = 50;
    const bannerW  = Math.round(courtHeight * 0.55);
    const stripW   = bannerH + 8;

    const imgStyle = (rotate: string) =>
      `width:${bannerW}px;height:${bannerH}px;object-fit:contain;transform:${rotate};`;

    const sideStyle = (side: 'left' | 'right') =>
      `position:absolute;top:0;bottom:0;${side}:0;width:${stripW}px;display:flex;align-items:center;justify-content:center;`;

    return `<div style="position:relative;display:inline-block;">
  ${svgString}
  ${left  ? `<div style="${sideStyle('left')}"><img src="${pick(left)}"  style="${imgStyle('rotate(-90deg)')}" /></div>` : ''}
  ${right ? `<div style="${sideStyle('right')}"><img src="${pick(right)}" style="${imgStyle('rotate(90deg)')}"  /></div>` : ''}
</div>`;
  }

  /**
   * Generate HTML template for PDF
   */
  private static generateHTML(data: {
    myTeamName: string;
    opponentName: string;
    myTeamScore: number;
    opponentScore: number;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamScore: number;
    awayTeamScore: number;
    matchDate: Date;
    periodLabel: string;
    totalPeriods: number;
    totalPeriodsPlayed: number;
    overtimePeriods: number;
    periodScoresMyTeam: number[];
    periodScoresOpponent: number[];
    periodScoresHome: number[];
    periodScoresAway: number[];
    evolutionMyTeam: number[];
    evolutionOpponent: number[];
    evolutionPeriods: number[];
    statsMyTeam: any[];
    statsOpponent: any[];
    trackOpponentStats: boolean;
    watermark?: boolean;
    clubLogoUrl?: string;
    courtBackgroundColor?: string;
    courtLineColor?: string;
    actions: any[];
    players: Player[];
    matchFormat: "2_halves" | "4_quarters";
    periodDuration: number;
    homeTeamHandicap?: number;
    awayTeamHandicap?: number;
    myTeamHandicap?: number;
    opponentHandicap?: number;
    matchSponsors?: PDFSponsor[];
  }): string {
    const {
      myTeamName,
      opponentName,
      myTeamScore,
      opponentScore,
      homeTeamName,
      awayTeamName,
      homeTeamScore,
      awayTeamScore,
      matchDate,
      periodLabel,
      totalPeriods,
      totalPeriodsPlayed,
      overtimePeriods,
      periodScoresMyTeam,
      periodScoresOpponent,
      periodScoresHome,
      periodScoresAway,
      evolutionMyTeam,
      evolutionOpponent,
      evolutionPeriods,
      statsMyTeam,
      statsOpponent,
      trackOpponentStats,
      watermark = false,
      clubLogoUrl,
      courtBackgroundColor = PDF_COLORS.court.background,
      courtLineColor = PDF_COLORS.court.line,
      actions,
      players,
      matchFormat,
      periodDuration,
      homeTeamHandicap = 0,
      awayTeamHandicap = 0,
      myTeamHandicap = 0,
      opponentHandicap = 0,
      matchSponsors = [],
    } = data;

    // Generate the score chart SVG with action-by-action evolution
    const chartSVG = this.generateScoreChart(
      evolutionMyTeam,
      evolutionOpponent,
      evolutionPeriods,
      periodLabel,
      totalPeriodsPlayed,
      trackOpponentStats,
      myTeamName,
      opponentName,
      totalPeriods // Pass base periods (2 or 4) to generate correct labels
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
      border-bottom: 2px solid ${PDF_COLORS.table.border};
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
      color: ${PDF_COLORS.table.textSecondary};
    }
    .score-summary {
      text-align: center;
      margin: 20px 0;
      font-size: 16px;
      font-weight: bold;
    }
    .score-summary .final-score {
      font-size: 24px;
      color: ${PDF_COLORS.table.text};
    }
    .period-scores {
      margin: 20px 0;
      width: 100%;
      border-collapse: collapse;
    }
    .period-scores th,
    .period-scores td {
      border: 1px solid ${PDF_COLORS.table.border};
      padding: 8px;
      text-align: center;
    }
    .period-scores th {
      background-color: ${PDF_COLORS.table.headerBg};
      font-weight: bold;
    }
    .period-scores .team-name {
      text-align: left;
      font-weight: bold;
    }
    .hcp-badge {
      display: inline-block;
      font-size: 8px;
      font-weight: 900;
      color: ${PDF_COLORS.team.myTeam};
      background-color: ${PDF_COLORS.team.myTeam}22;
      border: 1px solid ${PDF_COLORS.team.myTeam}55;
      border-radius: 3px;
      padding: 1px 4px;
      margin-left: 6px;
      vertical-align: middle;
      letter-spacing: 0.3px;
    }
    .starter-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 700;
      color: ${PDF_COLORS.card.accent};
      background-color: ${PDF_COLORS.card.accent}1a;
      border: 1px solid ${PDF_COLORS.card.accent}44;
      border-radius: 4px;
      padding: 2px 6px;
      margin-top: 4px;
      letter-spacing: 0.5px;
    }
    .team-rebound-row td {
      background-color: ${PDF_COLORS.table.headerBg};
      font-size: 8px;
      color: ${PDF_COLORS.table.textSecondary};
    }
    .stats-section {
      margin-top: 30px;
    }
    .stats-section h2 {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 15px;
      padding: 12px 16px;
      background-color: ${PDF_COLORS.table.headerBg};
      color: ${PDF_COLORS.table.text};
      border-radius: 8px;
      border-left: 4px solid ${PDF_COLORS.team.myTeam};
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .stats-section.team-a h2 {
      border-left-color: ${PDF_COLORS.team.myTeam};
    }
    .stats-section.team-b h2 {
      border-left-color: ${PDF_COLORS.team.opponent};
    }
    .stats-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .stats-table th,
    .stats-table td {
      border: 1px solid ${PDF_COLORS.table.border};
      padding: 6px 4px;
      text-align: center;
      font-size: 9px;
    }
    .stats-table th {
      background-color: ${PDF_COLORS.table.headerBg};
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
      background-color: ${PDF_COLORS.table.rowAltBg};
    }
    .legend {
      margin-top: 10px;
      font-size: 8px;
      color: ${PDF_COLORS.table.textSecondary};
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 9px;
      color: ${PDF_COLORS.table.textTertiary};
      border-top: 1px solid ${PDF_COLORS.table.border};
      padding-top: 10px;
    }
    .sponsor-header-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      margin: 12px 0 20px 0;
      padding: 10px 20px;
      border: 1px solid ${PDF_COLORS.table.border};
      border-radius: 8px;
      background: ${PDF_COLORS.table.headerBg};
    }
    .sponsor-header-label {
      font-size: 9px;
      font-style: italic;
      color: ${PDF_COLORS.table.textSecondary};
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sponsor-header-logo {
      height: 36px;
      width: auto;
      object-fit: contain;
    }
    .sponsor-footer-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 8px;
    }
    .sponsor-footer-label {
      font-size: 8px;
      font-style: italic;
      color: ${PDF_COLORS.table.textSecondary};
    }
    .sponsor-footer-logo {
      height: 28px;
      width: auto;
      object-fit: contain;
      opacity: 0.85;
    }
    .warning-banner {
      background-color: ${PDF_COLORS.warning.background};
      border: 2px solid ${PDF_COLORS.warning.border};
      border-radius: 8px;
      padding: 10px;
      margin-top: 15px;
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      color: ${PDF_COLORS.warning.text};
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
      border-bottom: 1px solid ${PDF_COLORS.table.border};
    }
    .player-card-match-info {
      font-size: 16px;
      font-weight: bold;
      color: ${PDF_COLORS.card.text};
      margin-bottom: 6px;
    }
    .player-card-date {
      font-size: 12px;
      color: ${PDF_COLORS.card.textSecondary};
    }
    .player-card-logo {
      position: absolute;
      right: 20px;
      top: -10px;
      width: 100px;
      height: auto;
    }
    .player-card-club-logo {
      position: absolute;
      left: 20px;
      top: 10px;
      height: 80px;
      width: auto;
    }
    .player-card {
      border: 1px solid ${PDF_COLORS.card.border};
      padding: 20px;
      margin-top: 20px;
      border-radius: 16px;
      max-width: 800px;
      width: 100%;
      page-break-inside: avoid;
      background: ${PDF_COLORS.card.headerBg};
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .player-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid ${PDF_COLORS.card.border};
    }
    .player-info-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .player-avatar-img {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 2px solid ${PDF_COLORS.card.border};
      object-fit: cover;
    }
    .player-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: ${PDF_COLORS.card.background};
      border: 2px solid ${PDF_COLORS.card.border};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      color: ${PDF_COLORS.card.text};
    }
    .player-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .player-name {
      font-size: 18px;
      font-weight: 700;
      color: ${PDF_COLORS.card.text};
      line-height: 1.2;
    }
    .player-number {
      font-size: 14px;
      color: ${PDF_COLORS.card.textSecondary};
      line-height: 1.2;
    }
    .player-points-badge {
      border: 1px solid ${PDF_COLORS.card.highlightBorder};
      border-radius: 12px;
      padding: 8px 16px;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      font-weight: bold;
      gap: 2px;
    }

    .player-points-value {
      font-size: 24px;
      font-weight: 700;
      color: ${PDF_COLORS.card.accent};
      line-height: 1;
      text-align: center;
    }
    .player-points-label {
      font-size: 11px;
      font-weight: 600;
      color: ${PDF_COLORS.card.accent};
      text-transform: uppercase;
      line-height: 1;
    }
    .shooting-bars {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid ${PDF_COLORS.card.border};
    }
    .shooting-bar {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .shooting-bar-label {
      font-size: 11px;
      font-weight: 600;
      color: ${PDF_COLORS.card.textSecondary};
      min-width: 50px;
      text-transform: uppercase;
    }
    .shooting-bar-track {
      flex: 1;
      height: 12px;
    }
    .shooting-bar-value {
      font-size: 13px;
      color: ${PDF_COLORS.card.text};
      min-width: 90px;
      text-align: right;
    }
    .shooting-bar-value-bold {
      font-weight: 700;
    }
    .shooting-bar-pct {
      color: ${PDF_COLORS.card.textSecondary};
      font-weight: 400;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
    }
    .stat-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 12px;
      background: ${PDF_COLORS.card.background};
      border: 1px solid ${PDF_COLORS.card.border};
      border-radius: 8px;
      text-align: center;
    }
    .stat-box.highlight {
      background: ${PDF_COLORS.card.highlightBg};
    }
    .stat-box-label {
      font-size: 11px;
      font-weight: 600;
      color: ${PDF_COLORS.card.textSecondary};
      text-transform: uppercase;
      line-height: 1;
    }
    .stat-box-value {
      font-size: 20px;
      font-weight: 700;
      color: ${PDF_COLORS.card.text};
      line-height: 1;
    }
    .stat-box-value.highlight {
      color: ${PDF_COLORS.card.accent};
    }
    .stat-box-value-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .courts-container {
      display: flex;
      flex-direction: column;
      gap: 0px;
      margin-bottom: 0px;
    }
    .court-wrapper {
      width: 100%;
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
      border-right: 1px solid ${PDF_COLORS.table.border};
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
      color: ${PDF_COLORS.table.textSecondary};
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
      color: ${PDF_COLORS.table.text};
      font-weight: 600;
    }

    .no-stats {
      text-align: center;
      color: ${PDF_COLORS.table.textTertiary};
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
    <div class="match-info">${homeTeamName} vs ${awayTeamName}</div>
    <div class="date">${dateStr}</div>
  </div>

  ${matchSponsors && matchSponsors.length > 0 ? `
  <div class="sponsor-header-bar">
    <span class="sponsor-header-label">Match présenté par</span>
    ${matchSponsors.sort((a, b) => a.priority - b.priority).map(s =>
      `<img src="${s.logo_url}" class="sponsor-header-logo" alt="${s.name}" title="${s.name}" />`
    ).join('')}
  </div>` : ''}

  <div class="score-summary">
    <div>SCORE FINAL</div>
    <div class="final-score">${homeTeamScore} - ${awayTeamScore}</div>
    ${(homeTeamHandicap > 0 || awayTeamHandicap > 0) ? `
    <div style="font-size:10px; color:${PDF_COLORS.table.textSecondary}; margin-top:4px;">
      ${homeTeamHandicap > 0 ? `${homeTeamName} <span class="hcp-badge">+${homeTeamHandicap} HCP</span>` : ''}
      ${homeTeamHandicap > 0 && awayTeamHandicap > 0 ? '&nbsp;&nbsp;' : ''}
      ${awayTeamHandicap > 0 ? `${awayTeamName} <span class="hcp-badge">+${awayTeamHandicap} HCP</span>` : ''}
    </div>` : ''}
  </div>

  <!-- Period Scores -->
  <table class="period-scores">
    <thead>
      <tr>
        <th>Équipe</th>
        ${Array.from({ length: totalPeriods })
          .map((_, i) => `<th>${periodLabel}${i + 1}</th>`)
          .join("")}
        ${Array.from({ length: overtimePeriods })
          .map((_, i) => `<th>OT${overtimePeriods > 1 ? i + 1 : ""}</th>`)
          .join("")}
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      <!-- Home Team (always shown first) -->
      <tr>
        <td class="team-name">${homeTeamName}${homeTeamHandicap > 0 ? ` <span class="hcp-badge">+${homeTeamHandicap} HCP</span>` : ''}</td>
        ${periodScoresHome.map((score) => `<td>${score}</td>`).join("")}
        <td><strong>${homeTeamScore}</strong></td>
      </tr>
      <!-- Away Team (always shown second) -->
      <tr>
        <td class="team-name">${awayTeamName}${awayTeamHandicap > 0 ? ` <span class="hcp-badge">+${awayTeamHandicap} HCP</span>` : ''}</td>
        ${periodScoresAway.map((score) => `<td>${score}</td>`).join("")}
        <td><strong>${awayTeamScore}</strong></td>
      </tr>
    </tbody>
  </table>

  <!-- Score Evolution Chart -->
  <div style="text-align: center; margin: 30px 0;">
    <h2 style="font-size: 14px; margin-bottom: 15px;">Évolution du score</h2>
    ${chartSVG}
  </div>

  ${this.generateTeamStatsTable(myTeamName, statsMyTeam, "team-a", actions.filter(a => a.team === Team.MY_TEAM), myTeamHandicap)}

  ${
    trackOpponentStats
      ? this.generateTeamStatsTable(opponentName, statsOpponent, "team-b", actions.filter(a => a.team === Team.OPPONENT), opponentHandicap)
      : ""
  }

  <!-- Individual Player Stats Section -->
  <div class="individual-stats-section">
    ${(() => {
      const pmLookup = new Map<string, number>();
      [...statsMyTeam, ...statsOpponent].forEach((p: any) => {
        pmLookup.set(`${p.team}-${p.num}`, p.stats.pm || 0);
      });
      return players
      .filter(
        (p) =>
          p.team === Team.MY_TEAM ||
          (trackOpponentStats && p.team === Team.OPPONENT)
      )
      .sort((a, b) => {
        if (a.team === b.team) return a.num - b.num;
        return a.team === Team.MY_TEAM ? -1 : 1;
      })
      .map((player) => {
        const playerStats = this.calculatePlayerStats(player.id, actions);
        const playerPm = pmLookup.get(`${player.team}-${player.num}`) || 0;
        const allActionsCourtSVG = this.wrapCourtWithSideBanners(
          this.generatePlayerAllActionsCourt(
            actions,
            player.id,
            courtBackgroundColor,
            courtLineColor,
            clubLogoUrl,
            matchSponsors
          ),
          matchSponsors,
          courtBackgroundColor
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

        console.log(
          `[PDF Export] 📊 Shooting percentages for player ${player.num}:`,
          {
            twoPoint: `${playerStats.twopm}/${playerStats.twopa} = ${twoPtPct}%`,
            threePoint: `${playerStats.threepm}/${playerStats.threepa} = ${threePtPct}%`,
            freeThrow: `${playerStats.ftm}/${playerStats.fta} = ${ftPct}%`,
          }
        );

        const hasStats =
          actions.filter((a) => a.player === player.id).length > 0;
        const teamName =
          player.team === Team.MY_TEAM ? myTeamName : opponentName;
        const totalFouls = this.calculateTotalFouls(playerStats);
        const playingTime = this.getPlayingTime(player.playingTimeSeconds);

        const avatarUrl = AvatarService.getAvatarUrl(
          player.name,
          player.photoUrl
        );

        return `
    <div class="player-card-page">
      ${
        clubLogoUrl
          ? `<img src="${clubLogoUrl}" alt="Club Logo" class="player-card-club-logo" />`
          : ""
      }
      <img src="${AppLogoSVG}" alt="App" class="player-card-logo" />
      <div class="player-card-header">
        <div class="player-card-match-info">${homeTeamName} ${homeTeamScore} - ${awayTeamScore} ${awayTeamName}</div>
        <div class="player-card-date">${dateStr}</div>
      </div>
      <div class="player-card">
        <div class="player-header">
          <div class="player-info-left">
            <img src="${avatarUrl}" alt="${
          player.name
        }" class="player-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            <div class="player-avatar" style="display: none;">${
              player.num
            }</div>
            <div class="player-info">
              <div class="player-name">${player.name}</div>
              <div class="player-number">#${player.num}</div>
              ${!player.isSubstitute ? '<span class="starter-badge">★ TITULAIRE</span>' : ''}
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
              <svg width="100%" height="12" style="display: block;">
                <rect x="0" y="0" width="100%" height="12" fill="${
                  PDF_COLORS.card.border
                }" rx="6"/>
                <rect x="0" y="0" width="${threePtPct}%" height="12" fill="${
          PDF_COLORS.shooting.threePoint
        }" rx="6"/>
              </svg>
            </div>
            <div class="shooting-bar-value">
              <span class="shooting-bar-value-bold">${playerStats.threepm}/${
          playerStats.threepa
        }</span>
              <span class="shooting-bar-pct"> (${threePtPct}%)</span>
            </div>
          </div>
          <div class="shooting-bar">
            <div class="shooting-bar-label">2 PTS</div>
            <div class="shooting-bar-track">
              <svg width="100%" height="12" style="display: block;">
                <rect x="0" y="0" width="100%" height="12" fill="${
                  PDF_COLORS.card.border
                }" rx="6"/>
                <rect x="0" y="0" width="${twoPtPct}%" height="12" fill="${
          PDF_COLORS.shooting.twoPoint
        }" rx="6"/>
              </svg>
            </div>
            <div class="shooting-bar-value">
              <span class="shooting-bar-value-bold">${playerStats.twopm}/${
          playerStats.twopa
        }</span>
              <span class="shooting-bar-pct"> (${twoPtPct}%)</span>
            </div>
          </div>
          <div class="shooting-bar">
            <div class="shooting-bar-label">LF</div>
            <div class="shooting-bar-track">
              <svg width="100%" height="12" style="display: block;">
                <rect x="0" y="0" width="100%" height="12" fill="${
                  PDF_COLORS.card.border
                }" rx="6"/>
                <rect x="0" y="0" width="${ftPct}%" height="12" fill="${
          PDF_COLORS.shooting.freeThrow
        }" rx="6"/>
              </svg>
            </div>
            <div class="shooting-bar-value">
              <span class="shooting-bar-value-bold">${playerStats.ftm}/${
          playerStats.fta
        }</span>
              <span class="shooting-bar-pct"> (${ftPct}%)</span>
            </div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-box-label">MIN</div>
            <div class="stat-box-value-row">
              <div class="stat-box-value">${playingTime}</div>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-box-label">REB OFF/DEF</div>
            <div class="stat-box-value-row">
              <svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink:0"><polygon points="8,2 14,14 2,14" fill="${getActionColor(ActionType.REBOUND, ReboundSpecification.OFFENSIVE)}" stroke="#FFFFFF" stroke-width="1"/></svg>
              <div class="stat-box-value">${playerStats.orb}/${playerStats.drb}</div>
              <svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink:0"><polygon points="8,2 14,14 2,14" fill="${getActionColor(ActionType.REBOUND, ReboundSpecification.DEFENSIVE)}" stroke="#FFFFFF" stroke-width="1"/></svg>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-box-label">AST</div>
            <div class="stat-box-value-row">
              <div class="stat-box-value">${playerStats.ast}</div>
              <svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink:0"><circle cx="8" cy="8" r="6" fill="${getActionColor(ActionType.ASSIST)}" stroke="#FFFFFF" stroke-width="2"/></svg>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-box-label">INT</div>
            <div class="stat-box-value-row">
              <div class="stat-box-value">${playerStats.stl}</div>
              <svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink:0"><circle cx="8" cy="8" r="6" fill="${getActionColor(ActionType.STEAL)}" stroke="#FFFFFF" stroke-width="2"/></svg>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-box-label">CTR</div>
            <div class="stat-box-value-row">
              <div class="stat-box-value">${playerStats.blk}</div>
              <svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink:0"><circle cx="8" cy="8" r="6" fill="${getActionColor(ActionType.BLOCK)}" stroke="#FFFFFF" stroke-width="2"/></svg>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-box-label">BP</div>
            <div class="stat-box-value-row">
              <div class="stat-box-value">${playerStats.tov}</div>
              <svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink:0"><circle cx="8" cy="8" r="6" fill="${getActionColor(ActionType.TURNOVER)}" stroke="#FFFFFF" stroke-width="2"/></svg>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-box-label">FT</div>
            <div class="stat-box-value-row">
              <div class="stat-box-value">${totalFouls}</div>
              <svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink:0"><polygon points="8,2 14,8 8,14 2,8" fill="${getActionColor(ActionType.FOUL)}" stroke="#FFFFFF" stroke-width="2"/></svg>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-box-label">FP</div>
            <div class="stat-box-value-row">
              <div class="stat-box-value">${playerStats.fd}</div>
              <svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink:0"><polygon points="8,2 14,8 8,14 2,8" fill="${getActionColor(ActionType.FOUL_DRAWN)}" stroke="#FFFFFF" stroke-width="2"/></svg>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-box-label">+/-</div>
            <div class="stat-box-value-row">
              <div class="stat-box-value" style="color:${playerPm > 0 ? '#4CAF50' : playerPm < 0 ? '#F44336' : 'inherit'}">${playerPm > 0 ? '+' + playerPm : playerPm}</div>
            </div>
          </div>
          <div class="stat-box highlight">
            <div class="stat-box-label">ÉVAL</div>
            <div class="stat-box-value-row">
              <div class="stat-box-value highlight">${calculateEfficiencyFromDB(playerStats)}</div>
            </div>
          </div>
        </div>

      ${
        hasStats
          ? `
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid ${PDF_COLORS.card.border};">
        <div class="courts-container">
          <div class="court-wrapper">
            ${allActionsCourtSVG}
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
      .join("");
    })()}
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate a standalone PDF for a single player's stats
   */
  static async generatePlayerPDF(options: {
    player: {
      playerNumber: number;
      name: string;
      team: "MyTeam" | "Opponent";
      photoUrl?: string;
      isSubstitute: boolean;
      pts: number;
      reb_off: number;
      reb_def: number;
      ast: number;
      stl: number;
      blk: number;
      to: number;
      pf: number;
      fd: number;
      ftm: number;
      fta: number;
      fg2m: number;
      fg2a: number;
      fg3m: number;
      fg3a: number;
      fgm: number;
      fga: number;
      eff: number;
      pm: number | null;
      min: string;
    };
    actions: any[];
    myTeamName: string;
    opponentName: string;
    clubLogoUrl?: string;
    courtBackgroundColor?: string;
    courtLineColor?: string;
    matchDate?: Date;
    watermark?: boolean;
    headerTitle?: string;
    radarSVG?: string;
    hideStarterBadge?: boolean;
    fileName?: string;
    matchSponsors?: PDFSponsor[];
  }): Promise<string> {
    const {
      player,
      actions,
      myTeamName,
      opponentName,
      clubLogoUrl,
      courtBackgroundColor = PDF_COLORS.court.background,
      courtLineColor = PDF_COLORS.court.line,
      matchDate = new Date(),
      watermark = false,
      headerTitle,
      radarSVG,
      hideStarterBadge = false,
      fileName,
      matchSponsors,
    } = options;

    let playerPhotoBase64: string | null = null;
    if (player.photoUrl && player.photoUrl.startsWith("http")) {
      playerPhotoBase64 = await this.imageUrlToBase64(player.photoUrl);
    }

    // Header logo: only the club logo if provided
    let logoBase64: string | undefined;
    if (clubLogoUrl && clubLogoUrl.startsWith("http")) {
      logoBase64 = (await this.imageUrlToBase64(clubLogoUrl)) || clubLogoUrl;
    }

    // Court logo: club logo if available, otherwise default app logo
    const courtLogoBase64 = logoBase64 ?? ((await this.loadDefaultLogo()) || undefined);

    const AppLogoSVG = this.generateAppLogoSVG();

    const playerActions = actions.filter((a) => {
      const num = a.player_number ?? a.player;
      return num === player.playerNumber && a.team === player.team;
    });

    const hasPositionedActions = playerActions.some((a) => a.semanticPosition);
    const courtSVG = hasPositionedActions
      ? (() => {
          const markers: CourtMarker[] = playerActions
            .filter((a) => a.semanticPosition)
            .map((a, i) => ({
              id: `marker-${i}`,
              svgX: a.semanticPosition.xNormalized * COURT_SVG_WIDTH_PORTRAIT,
              svgY: a.semanticPosition.yNormalized * COURT_SVG_HEIGHT_PORTRAIT,
              color: getActionColor(
                a.action_type || a.type,
                a.specification,
                a.points
              ),
              actionType: a.action_type || a.type,
              specification: a.specification,
            }));
          return this.wrapCourtWithSideBanners(
            this.generateBasketballCourtSVG(
              465,
              250,
              courtBackgroundColor,
              courtLineColor,
              markers,
              courtLogoBase64,
              matchSponsors
            ),
            matchSponsors,
            courtBackgroundColor
          );
        })()
      : null;

    const teamLabel =
      player.team === Team.MY_TEAM ? myTeamName : opponentName;

    const dateStr = matchDate.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const threePtPct = player.fg3a > 0 ? Math.round((player.fg3m / player.fg3a) * 100) : 0;
    const twoPtPct = player.fg2a > 0 ? Math.round((player.fg2m / player.fg2a) * 100) : 0;
    const ftPct = player.fta > 0 ? Math.round((player.ftm / player.fta) * 100) : 0;
    const totalFgPct = player.fga > 0 ? Math.round((player.fgm / player.fga) * 100) : 0;
    const pmDisplay = player.pm === null ? "—" : player.pm > 0 ? `+${player.pm}` : `${player.pm}`;
    const pmColor = player.pm === null
      ? PDF_COLORS.card.textSecondary
      : player.pm > 0 ? "#4CAF50" : player.pm < 0 ? "#F44336" : PDF_COLORS.card.text;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      padding: 24px;
      font-size: 10px;
      background: white;
      color: ${PDF_COLORS.card.text};
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .content-wrapper { flex: 1; }
    ${watermark ? `
    body::before {
      content: 'PREVIEW';
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120px; font-weight: bold;
      color: rgba(255, 107, 53, 0.15);
      z-index: 9999; pointer-events: none; white-space: nowrap;
    }` : ""}
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      padding-bottom: 14px;
      border-bottom: 2px solid ${PDF_COLORS.table.border};
      margin-bottom: 20px;
      min-height: 80px;
    }
    .page-header-logo-left { height: 64px; width: auto; }
    .page-header-logo-right { height: 72px; width: auto; }
    .page-header-center { text-align: center; flex: 1; }
    .page-header-match { font-size: 13px; font-weight: 700; color: ${PDF_COLORS.card.text}; }
    .page-header-date { font-size: 11px; color: ${PDF_COLORS.card.textSecondary}; margin-top: 4px; }
    .player-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 18px; padding-bottom: 14px;
      border-bottom: 1px solid ${PDF_COLORS.card.border};
    }
    .player-info-left { display: flex; align-items: center; gap: 14px; }
    .player-avatar-img { width: 56px; height: 56px; border-radius: 50%; border: 3px solid ${PDF_COLORS.card.border}; object-fit: cover; }
    .player-avatar {
      width: 56px; height: 56px; border-radius: 50%;
      background: ${PDF_COLORS.card.headerBg};
      border: 3px solid ${PDF_COLORS.card.border};
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 700; color: ${PDF_COLORS.card.text};
    }
    .player-name { font-size: 20px; font-weight: 900; color: ${PDF_COLORS.card.text}; line-height: 1.2; }
    .player-sub { font-size: 12px; color: ${PDF_COLORS.card.textSecondary}; margin-top: 3px; }
    .starter-badge {
      display: inline-block; font-size: 9px; font-weight: 700;
      color: ${PDF_COLORS.card.accent}; background: ${PDF_COLORS.card.highlightBg};
      border: 1px solid ${PDF_COLORS.card.highlightBorder};
      border-radius: 4px; padding: 2px 6px; margin-top: 4px;
    }
    .player-points-badge {
      border: 2px solid ${PDF_COLORS.card.highlightBorder};
      border-radius: 12px; padding: 10px 20px;
      display: inline-flex; flex-direction: column; align-items: center; gap: 2px;
    }
    .player-points-value { font-size: 28px; font-weight: 900; color: ${PDF_COLORS.card.accent}; line-height: 1; }
    .player-points-label { font-size: 10px; font-weight: 700; color: ${PDF_COLORS.card.accent}; text-transform: uppercase; }
    .main-stats-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 10px; margin-bottom: 20px;
    }
    .main-stat-card {
      text-align: center; padding: 14px 10px;
      background: ${PDF_COLORS.card.headerBg};
      border: 1px solid ${PDF_COLORS.card.border};
      border-radius: 12px;
    }
    .main-stat-card.highlight {
      border: 2px solid ${PDF_COLORS.card.highlightBorder};
      background: ${PDF_COLORS.card.highlightBg};
    }
    .main-stat-value { font-size: 26px; font-weight: 900; color: ${PDF_COLORS.card.text}; line-height: 1; }
    .main-stat-value.highlight { color: ${PDF_COLORS.card.accent}; }
    .main-stat-label { font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: ${PDF_COLORS.card.textSecondary}; margin-top: 5px; }
    .section-title { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: ${PDF_COLORS.card.text}; margin-bottom: 10px; }
    .shooting-section { margin-bottom: 20px; }
    .shooting-card { border: 1px solid ${PDF_COLORS.card.border}; border-radius: 12px; padding: 16px; }
    .shooting-bars { display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; }
    .shooting-bar { display: flex; align-items: center; gap: 12px; }
    .shooting-bar-label { font-size: 11px; font-weight: 600; color: ${PDF_COLORS.card.textSecondary}; min-width: 55px; text-transform: uppercase; }
    .shooting-bar-track { flex: 1; height: 12px; }
    .shooting-bar-value { font-size: 12px; color: ${PDF_COLORS.card.text}; min-width: 100px; text-align: right; }
    .shooting-bar-value-bold { font-weight: 700; }
    .shooting-bar-pct { color: ${PDF_COLORS.card.textSecondary}; }
    .shooting-summary { display: flex; border-top: 1px solid ${PDF_COLORS.card.border}; padding-top: 10px; }
    .shooting-summary-item { flex: 1; text-align: center; }
    .shooting-summary-value { font-size: 20px; font-weight: 900; color: ${PDF_COLORS.card.text}; }
    .shooting-summary-label { font-size: 8px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: ${PDF_COLORS.card.textSecondary}; margin-top: 2px; }
    .details-section { margin-bottom: 20px; }
    .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .stat-box {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 12px 8px; background: ${PDF_COLORS.card.background};
      border: 1px solid ${PDF_COLORS.card.border}; border-radius: 8px; text-align: center;
    }
    .stat-box-label { font-size: 10px; font-weight: 600; color: ${PDF_COLORS.card.textSecondary}; text-transform: uppercase; line-height: 1; }
    .stat-box-value { font-size: 20px; font-weight: 700; color: ${PDF_COLORS.card.text}; line-height: 1; }
    .stat-box-value-row { display: flex; align-items: center; justify-content: center; gap: 4px; }
    .court-section { margin-top: 20px; }
    .court-wrapper { text-align: center; border-radius: 12px; overflow: hidden; }
    .footer { margin-top: 24px; text-align: center; font-size: 9px; color: ${PDF_COLORS.table.textTertiary}; border-top: 1px solid ${PDF_COLORS.table.border}; padding-top: 10px; }
  </style>
</head>
<body>
<div class="content-wrapper">
  <div class="page-header">
    ${logoBase64 ? `<img src="${logoBase64}" class="page-header-logo-left" alt="Logo" />` : ""}
    <div class="page-header-center">
      <div class="page-header-match">${headerTitle ?? `${myTeamName} vs ${opponentName}`}</div>
      <div class="page-header-date">${dateStr}</div>
    </div>
    <img src="${AppLogoSVG}" class="page-header-logo-right" alt="App" />
  </div>

  <div class="player-header">
    <div class="player-info-left">
      ${playerPhotoBase64
        ? `<img src="${playerPhotoBase64}" class="player-avatar-img" alt="${player.name}" />`
        : `<div class="player-avatar">${player.playerNumber}</div>`
      }
      <div>
        <div class="player-name">${player.name} <span style="font-size:14px;font-weight:700;color:${PDF_COLORS.card.textSecondary}">- #${player.playerNumber}</span></div>
        <div class="player-sub">${teamLabel}</div>
        ${!player.isSubstitute && !hideStarterBadge ? `<span class="starter-badge">★ TITULAIRE</span>` : ""}
      </div>
    </div>
    <div class="player-points-badge">
      <div class="player-points-value">${player.pts}</div>
      <div class="player-points-label">Points</div>
    </div>
  </div>

  <div class="main-stats-grid">
    <div class="main-stat-card">
      <div class="main-stat-value">${player.min}</div>
      <div class="main-stat-label">Temps</div>
    </div>
    <div class="main-stat-card">
      <div class="main-stat-value">${player.pts}</div>
      <div class="main-stat-label">Points</div>
    </div>
    <div class="main-stat-card">
      <div class="main-stat-value" style="color:${pmColor}">${pmDisplay}</div>
      <div class="main-stat-label">+/-</div>
    </div>
    <div class="main-stat-card highlight">
      <div class="main-stat-value highlight">${player.eff}</div>
      <div class="main-stat-label">Éval</div>
    </div>
  </div>

  <div class="shooting-section">
    <div class="section-title">Performance aux tirs</div>
    <div class="shooting-card">
      <div class="shooting-bars">
        <div class="shooting-bar">
          <div class="shooting-bar-label">3 Points</div>
          <div class="shooting-bar-track">
            <svg width="100%" height="12" style="display:block;">
              <rect x="0" y="0" width="100%" height="12" fill="${PDF_COLORS.card.border}" rx="6"/>
              <rect x="0" y="0" width="${threePtPct}%" height="12" fill="${PDF_COLORS.shooting.threePoint}" rx="6"/>
            </svg>
          </div>
          <div class="shooting-bar-value">
            <span class="shooting-bar-value-bold">${player.fg3m}/${player.fg3a}</span>
            <span class="shooting-bar-pct"> (${threePtPct}%)</span>
          </div>
        </div>
        <div class="shooting-bar">
          <div class="shooting-bar-label">2 Points</div>
          <div class="shooting-bar-track">
            <svg width="100%" height="12" style="display:block;">
              <rect x="0" y="0" width="100%" height="12" fill="${PDF_COLORS.card.border}" rx="6"/>
              <rect x="0" y="0" width="${twoPtPct}%" height="12" fill="${PDF_COLORS.shooting.twoPoint}" rx="6"/>
            </svg>
          </div>
          <div class="shooting-bar-value">
            <span class="shooting-bar-value-bold">${player.fg2m}/${player.fg2a}</span>
            <span class="shooting-bar-pct"> (${twoPtPct}%)</span>
          </div>
        </div>
        <div class="shooting-bar">
          <div class="shooting-bar-label">Lancers</div>
          <div class="shooting-bar-track">
            <svg width="100%" height="12" style="display:block;">
              <rect x="0" y="0" width="100%" height="12" fill="${PDF_COLORS.card.border}" rx="6"/>
              <rect x="0" y="0" width="${ftPct}%" height="12" fill="${PDF_COLORS.shooting.freeThrow}" rx="6"/>
            </svg>
          </div>
          <div class="shooting-bar-value">
            <span class="shooting-bar-value-bold">${player.ftm}/${player.fta}</span>
            <span class="shooting-bar-pct"> (${ftPct}%)</span>
          </div>
        </div>
      </div>
      <div class="shooting-summary">
        <div class="shooting-summary-item">
          <div class="shooting-summary-value">${player.fgm}/${player.fga}</div>
          <div class="shooting-summary-label">Total tirs</div>
        </div>
        <div class="shooting-summary-item">
          <div class="shooting-summary-value">${totalFgPct}%</div>
          <div class="shooting-summary-label">Réussite</div>
        </div>
      </div>
    </div>
  </div>

  <div class="details-section">
    <div class="section-title">Détails</div>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-box-label">REB OFF/DEF</div>
        <div class="stat-box-value-row">
          <svg width="14" height="14" viewBox="0 0 16 16"><polygon points="8,2 14,14 2,14" fill="${getActionColor(ActionType.REBOUND, ReboundSpecification.OFFENSIVE)}" stroke="#FFFFFF" stroke-width="1"/></svg>
          <div class="stat-box-value">${player.reb_off}/${player.reb_def}</div>
          <svg width="14" height="14" viewBox="0 0 16 16"><polygon points="8,2 14,14 2,14" fill="${getActionColor(ActionType.REBOUND, ReboundSpecification.DEFENSIVE)}" stroke="#FFFFFF" stroke-width="1"/></svg>
        </div>
      </div>
      <div class="stat-box">
        <div class="stat-box-label">AST</div>
        <div class="stat-box-value-row">
          <div class="stat-box-value">${player.ast}</div>
          <svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="${getActionColor(ActionType.ASSIST)}" stroke="#FFFFFF" stroke-width="2"/></svg>
        </div>
      </div>
      <div class="stat-box">
        <div class="stat-box-label">INT</div>
        <div class="stat-box-value-row">
          <div class="stat-box-value">${player.stl}</div>
          <svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="${getActionColor(ActionType.STEAL)}" stroke="#FFFFFF" stroke-width="2"/></svg>
        </div>
      </div>
      <div class="stat-box">
        <div class="stat-box-label">CTR</div>
        <div class="stat-box-value-row">
          <div class="stat-box-value">${player.blk}</div>
          <svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="${getActionColor(ActionType.BLOCK)}" stroke="#FFFFFF" stroke-width="2"/></svg>
        </div>
      </div>
      <div class="stat-box">
        <div class="stat-box-label">BP</div>
        <div class="stat-box-value-row">
          <div class="stat-box-value">${player.to}</div>
          <svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="${getActionColor(ActionType.TURNOVER)}" stroke="#FFFFFF" stroke-width="2"/></svg>
        </div>
      </div>
      <div class="stat-box">
        <div class="stat-box-label">FTE</div>
        <div class="stat-box-value-row">
          <div class="stat-box-value">${player.pf}</div>
          <svg width="14" height="14" viewBox="0 0 16 16"><polygon points="8,2 14,8 8,14 2,8" fill="${getActionColor(ActionType.FOUL)}" stroke="#FFFFFF" stroke-width="2"/></svg>
        </div>
      </div>
      <div class="stat-box">
        <div class="stat-box-label">FP</div>
        <div class="stat-box-value-row">
          <div class="stat-box-value">${player.fd}</div>
          <svg width="14" height="14" viewBox="0 0 16 16"><polygon points="8,2 14,8 8,14 2,8" fill="${getActionColor(ActionType.FOUL_DRAWN)}" stroke="#FFFFFF" stroke-width="2"/></svg>
        </div>
      </div>
    </div>
  </div>

  ${radarSVG ? `
  <div style="margin-top:20px;">
    <div class="section-title">Vue d'ensemble</div>
    <div style="text-align:center;margin-top:10px;">${radarSVG}</div>
  </div>
  ` : ""}

  ${courtSVG ? `
  <div class="court-section">
    <div class="section-title">Carte des actions</div>
    <div class="court-wrapper">${courtSVG}</div>
  </div>
  ` : ""}
</div>

  <div class="footer">
    ${matchSponsors && matchSponsors.length > 0 ? `
    <div class="sponsor-footer-bar">
      <span class="sponsor-footer-label">Partenaires officiels</span>
      ${matchSponsors.sort((a, b) => a.priority - b.priority).map(s =>
        `<img src="${s.logo_url}" class="sponsor-footer-logo" alt="${s.name}" title="${s.name}" />`
      ).join('')}
    </div>` : ''}
    Généré par Coach Assistant • ${dateStr}
  </div>
</body>
</html>`;

    const computedFileName = fileName ?? `${this.sanitizeFileName(myTeamName)}_${this.sanitizeFileName(opponentName)}_${this.sanitizeFileName(player.name)}_stats_${this.formatDateFile(matchDate)}`;
    const { uri } = await this.printAndRename(html, computedFileName);

    if (await Sharing.isAvailableAsync()) {
      const sharingOptions: Record<string, any> = {};
      if (Platform.OS === PlatformOS.IOS) {
        sharingOptions.UTI = "com.adobe.pdf";
        sharingOptions.mimeType = "application/pdf";
      } else if (Platform.OS === PlatformOS.ANDROID) {
        sharingOptions.mimeType = "application/pdf";
      }
      await Sharing.shareAsync(uri, sharingOptions);
    }

    return uri;
  }

  private static generateRadarSVG(data: {
    avgPts: number; avgReb: number; avgAst: number; avgEff: number;
    stl: number; blk: number; fgm: number; fga: number; matchesPlayed: number;
  }, size: number = 220): string {
    const AXES = ["PTS", "REB", "AST", "INT", "CTR", "ÉVAL", "%TIR"];
    const N = AXES.length;
    const REFS = [30, 10, 10, 10, 10, 20, 1.0];
    const GRID_LEVELS = [0.2, 0.4, 0.6, 0.8, 1.0];
    const primary = PDF_COLORS.card.accent;
    const grid = PDF_COLORS.table.textSecondary;

    const n = data.matchesPlayed || 1;
    const fgPct = data.fga > 0 ? data.fgm / data.fga : 0;
    const values = [
      Math.max(0, Math.min(data.avgPts / REFS[0], 1)),
      Math.max(0, Math.min(data.avgReb / REFS[1], 1)),
      Math.max(0, Math.min(data.avgAst / REFS[2], 1)),
      Math.max(0, Math.min((data.stl / n) / REFS[3], 1)),
      Math.max(0, Math.min((data.blk / n) / REFS[4], 1)),
      Math.max(0, Math.min(data.avgEff / REFS[5], 1)),
      Math.max(0, Math.min(fgPct / REFS[6], 1)),
    ];

    const cx = size / 2, cy = size / 2;
    const r = size * 0.38;
    const lr = size * 0.50;
    const fs = Math.max(9, Math.round(size * 0.065));
    const pad = Math.round(size * 0.22);
    const vbSize = size + 2 * pad;

    const ang = (i: number) => (i / N) * 2 * Math.PI - Math.PI / 2;
    const pt = (i: number, t: number) => ({
      x: cx + r * t * Math.cos(ang(i)),
      y: cy + r * t * Math.sin(ang(i)),
    });
    const poly = (vals: number[]) =>
      vals.map((v, i) => { const p = pt(i, v); return `${p.x.toFixed(2)},${p.y.toFixed(2)}`; }).join(" ");

    const rings = GRID_LEVELS.map((t) =>
      `<polygon points="${poly(Array(N).fill(t))}" fill="none" stroke="${grid}" stroke-width="${t === 1.0 ? 1.2 : 0.6}" stroke-opacity="${t === 1.0 ? 0.4 : 0.2}"/>`
    ).join("");

    const spokes = Array.from({ length: N }, (_, i) => {
      const p = pt(i, 1);
      return `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(2)}" y2="${p.y.toFixed(2)}" stroke="${grid}" stroke-width="0.6" stroke-opacity="0.2"/>`;
    }).join("");

    const playerPoly = `<polygon points="${poly(values)}" fill="${primary}33" stroke="${primary}" stroke-width="1.5"/>`;

    const dots = values.map((v, i) => {
      const p = pt(i, v);
      return `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="3" fill="${primary}"/>`;
    }).join("");

    const labels = AXES.map((label, i) => {
      const a = ang(i);
      const lx = (cx + lr * Math.cos(a)).toFixed(2);
      const ly = (cy + lr * Math.sin(a) + fs * 0.38).toFixed(2);
      return `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="${fs}" font-weight="600" fill="${grid}" font-family="Arial,sans-serif">${label}</text>`;
    }).join("");

    return `<svg width="${size}" height="${size}" viewBox="${-pad} ${-pad} ${vbSize} ${vbSize}" xmlns="http://www.w3.org/2000/svg">${rings}${spokes}${playerPoly}${dots}${labels}</svg>`;
  }

  /**
   * Export PDF for a player's season averages — adapter over generatePlayerPDF
   */
  static async generatePlayerSeasonPDF(options: {
    player: {
      playerNumber: number;
      playerName: string;
      photoUrl?: string;
      matchesPlayed: number;
      avgPts: number;
      avgEff: number;
      totalPlayingTimeSeconds: number;
      matchesWithTrackedTime: number;
      reb_off: number; reb_def: number;
      ast: number; stl: number; blk: number;
      to: number; pf: number; fd: number;
      ftm: number; fta: number;
      fg2m: number; fg2a: number;
      fg3m: number; fg3a: number;
      fgm: number; fga: number;
    };
    clubLogoUrl?: string;
    courtBackgroundColor?: string;
    courtLineColor?: string;
    watermark?: boolean;
    period?: string;
  }): Promise<string> {
    const { player, period, ...rest } = options;
    const n = player.matchesPlayed || 1;
    const nTime = player.matchesWithTrackedTime || 0;

    const avgSec = nTime > 0 ? Math.round(player.totalPlayingTimeSeconds / nTime) : 0;
    const avgMin = nTime > 0 ? `${Math.floor(avgSec / 60)}:${String(avgSec % 60).padStart(2, "0")}` : '--:--';

    const round1 = (v: number) => Math.round(v * 10) / 10;

    const periodSuffix: Record<string, string> = {
      season: "all",
      "3_months": "3months",
      last_5: "5games",
    };
    const periodTag = period ? (periodSuffix[period] ?? period) : "all";
    const seasonFileName = `${this.sanitizeFileName(player.playerName)}_mean_stats_${periodTag}`;

    const radarSVG = this.generateRadarSVG(
      {
        ...player,
        avgReb: (player.reb_off + player.reb_def) / n,
        avgAst: player.ast / n,
      },
      240
    );

    return this.generatePlayerPDF({
      player: {
        playerNumber: player.playerNumber,
        name: player.playerName,
        team: Team.MY_TEAM,
        photoUrl: player.photoUrl,
        isSubstitute: false,
        pts: round1(player.avgPts),
        reb_off: round1(player.reb_off / n),
        reb_def: round1(player.reb_def / n),
        ast: round1(player.ast / n),
        stl: round1(player.stl / n),
        blk: round1(player.blk / n),
        to: round1(player.to / n),
        pf: round1(player.pf / n),
        fd: round1(player.fd / n),
        ftm: player.ftm,
        fta: player.fta,
        fg2m: player.fg2m,
        fg2a: player.fg2a,
        fg3m: player.fg3m,
        fg3a: player.fg3a,
        fgm: player.fgm,
        fga: player.fga,
        eff: round1(player.avgEff),
        pm: null,
        min: avgMin,
      },
      actions: [],
      myTeamName: "",
      opponentName: "",
      headerTitle: `Statistiques moyennes • ${player.matchesPlayed} match${player.matchesPlayed > 1 ? "s" : ""}`,
      radarSVG,
      hideStarterBadge: true,
      fileName: seasonFileName,
      ...rest,
    });
  }
}
